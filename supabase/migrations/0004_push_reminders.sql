-- New Life: background reminders via Web Push.
--
-- The app computes the next ~48 hours of reminders on the device (prayer, training, food, honouring quiet hours)
-- and uploads them with replace_reminders(). A scheduled job (the send-reminders edge function, run every minute)
-- claims due rows and delivers them. Delivery needs: a push subscription, VAPID keys, and that scheduled job.
-- If the device stays offline for long, the schedule stops being refreshed; stale reminders are skipped, never sent late.

create table if not exists public.push_subscriptions (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text        not null check (char_length(endpoint) between 1 and 2000),
  p256dh     text        not null,
  auth       text        not null,
  user_agent text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

create table if not exists public.scheduled_reminders (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (char_length(key) between 1 and 200),
  kind       text        not null check (kind in ('prayer', 'training', 'food')),
  fire_at    timestamptz not null,
  title      text        not null check (char_length(title) <= 120),
  body       text        not null check (char_length(body) <= 300),
  url        text        not null default '/' check (url like '/%'),
  sent_at    timestamptz,
  skipped_at timestamptz,
  primary key (user_id, key)
);
create index if not exists scheduled_reminders_due on public.scheduled_reminders (fire_at)
  where sent_at is null and skipped_at is null;

alter table public.push_subscriptions enable row level security;
alter table public.scheduled_reminders enable row level security;

drop policy if exists "read own subscriptions" on public.push_subscriptions;
create policy "read own subscriptions" on public.push_subscriptions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "read own reminders" on public.scheduled_reminders;
create policy "read own reminders" on public.scheduled_reminders for select to authenticated using (auth.uid() = user_id);

revoke all on public.push_subscriptions, public.scheduled_reminders from public, anon, authenticated;
grant select on public.push_subscriptions, public.scheduled_reminders to authenticated;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text, p_expires timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, expires_at)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent, p_expires)
  on conflict (user_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, expires_at = excluded.expires_at;
end $$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  delete from public.push_subscriptions where user_id = auth.uid() and endpoint = p_endpoint;
end $$;

-- Replaces the user's unsent future reminders with the given set (jsonb array of {key,kind,fire_at,title,body,url}).
create or replace function public.replace_reminders(p_items jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'invalid reminder set' using errcode = '22023';
  end if;
  delete from public.scheduled_reminders
   where user_id = auth.uid() and sent_at is null and skipped_at is null and fire_at > now()
     and key not in (select x->>'key' from jsonb_array_elements(p_items) x);
  insert into public.scheduled_reminders (user_id, key, kind, fire_at, title, body, url)
  select auth.uid(), x->>'key', x->>'kind', (x->>'fire_at')::timestamptz, x->>'title', x->>'body', coalesce(x->>'url', '/')
    from jsonb_array_elements(p_items) x
  on conflict (user_id, key) do update
    set fire_at = excluded.fire_at, title = excluded.title, body = excluded.body, url = excluded.url
    where public.scheduled_reminders.sent_at is null and public.scheduled_reminders.skipped_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.disable_reminders()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  delete from public.scheduled_reminders where user_id = auth.uid() and sent_at is null and skipped_at is null;
end $$;

-- Server-only: marks stale reminders as skipped, claims due ones exactly once, and returns them with their subscriptions.
create or replace function public.claim_due_reminders(p_stale_after interval default interval '10 minutes')
returns table (user_id uuid, key text, title text, body text, url text, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
begin
  update public.scheduled_reminders r set skipped_at = now()
   where r.sent_at is null and r.skipped_at is null and r.fire_at < now() - p_stale_after;
  return query
  with due as (
    update public.scheduled_reminders r set sent_at = now()
     where r.sent_at is null and r.skipped_at is null and r.fire_at <= now()
     returning r.user_id, r.key, r.title, r.body, r.url
  )
  select d.user_id, d.key, d.title, d.body, d.url, s.endpoint, s.p256dh, s.auth
    from due d join public.push_subscriptions s on s.user_id = d.user_id
   where s.expires_at is null or s.expires_at > now();
end $$;

revoke all on function public.save_push_subscription(text, text, text, text, timestamptz) from public, anon;
revoke all on function public.delete_push_subscription(text) from public, anon;
revoke all on function public.replace_reminders(jsonb) from public, anon;
revoke all on function public.disable_reminders() from public, anon;
revoke all on function public.claim_due_reminders(interval) from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, text, text, text, timestamptz) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;
grant execute on function public.replace_reminders(jsonb) to authenticated;
grant execute on function public.disable_reminders() to authenticated;
-- claim_due_reminders is callable only with the service role (used by the edge function).
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.claim_due_reminders(interval) to service_role;
  end if;
end $$;
