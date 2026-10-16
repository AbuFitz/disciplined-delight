-- VAYVOR Circle chat.
-- Messages are private to two accepted, unblocked connections. They are protected by RLS in transit/storage,
-- but they are not end-to-end encrypted; the UI states that plainly. Attachments and group chat are not enabled.

create table if not exists public.circle_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists circle_messages_pair_time_idx
  on public.circle_messages(least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index if not exists circle_messages_unread_idx
  on public.circle_messages(recipient_id, created_at desc) where read_at is null and deleted_at is null;

create or replace function public.circle_chat_allowed(me uuid, other_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select me is not null and other_user is not null and me <> other_user
    and not public.circle_is_blocked(me, other_user)
    and exists (
      select 1 from public.circle_connections c
      where c.status = 'accepted'
        and c.user_low = least(me, other_user)
        and c.user_high = greatest(me, other_user)
    )
$$;

-- Safe for an RLS policy and direct authenticated execution: the caller must be one of the row's participants.
create or replace function public.circle_message_visible(message_sender uuid, message_recipient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
    and auth.uid() in (message_sender, message_recipient)
    and public.circle_chat_allowed(
      auth.uid(),
      case when auth.uid() = message_sender then message_recipient else message_sender end
    )
$$;

alter table public.circle_messages enable row level security;
drop policy if exists "read own unblocked messages" on public.circle_messages;
create policy "read own unblocked messages" on public.circle_messages for select to authenticated using (
  public.circle_message_visible(sender_id, recipient_id)
);
revoke all on public.circle_messages from public, anon, authenticated;
grant select on public.circle_messages to authenticated;

create or replace function public.circle_chat_threads()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  last_message text,
  last_at timestamptz,
  last_mine boolean,
  unread_count bigint
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  return query
    select p.user_id, p.username, p.display_name, p.avatar_path,
      case when last_msg.deleted_at is not null then 'Message removed' else last_msg.body end,
      last_msg.created_at,
      last_msg.sender_id = me,
      (
        select count(*) from public.circle_messages unread
        where unread.sender_id = p.user_id and unread.recipient_id = me
          and unread.read_at is null and unread.deleted_at is null
      )
    from public.circle_connections c
    join public.profiles p on p.user_id = case when c.user_low = me then c.user_high else c.user_low end
    left join lateral (
      select m.body, m.created_at, m.sender_id, m.deleted_at
      from public.circle_messages m
      where (m.sender_id = me and m.recipient_id = p.user_id)
         or (m.sender_id = p.user_id and m.recipient_id = me)
      order by m.created_at desc
      limit 1
    ) last_msg on true
    where c.status = 'accepted'
      and me in (c.user_low, c.user_high)
      and not public.circle_is_blocked(me, p.user_id)
    order by last_msg.created_at desc nulls last, p.display_name, p.username;
end $$;

create or replace function public.circle_chat_messages(
  p_user_id uuid,
  p_before timestamptz default null,
  p_limit integer default 60
) returns table (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
  body text,
  created_at timestamptz,
  read_at timestamptz,
  deleted boolean,
  mine boolean
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  if not public.circle_chat_allowed(me, p_user_id) then
    raise exception 'chat_unavailable' using errcode = '42501';
  end if;
  return query
    select m.id, m.sender_id, m.recipient_id,
      case when m.deleted_at is not null then 'Message removed' else m.body end,
      m.created_at, m.read_at, m.deleted_at is not null, m.sender_id = me
    from public.circle_messages m
    where ((m.sender_id = me and m.recipient_id = p_user_id)
        or (m.sender_id = p_user_id and m.recipient_id = me))
      and (p_before is null or m.created_at < p_before)
    order by m.created_at desc
    limit least(greatest(coalesce(p_limit, 60), 1), 100);
end $$;

create or replace function public.circle_chat_send(p_user_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare new_id uuid;
begin
  if not public.circle_chat_allowed(me, p_user_id) then
    raise exception 'chat_unavailable' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 1000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  insert into public.circle_messages(sender_id, recipient_id, body)
    values (me, p_user_id, btrim(p_body)) returning id into new_id;
  return new_id;
end $$;

create or replace function public.circle_chat_mark_read(p_user_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare changed integer;
begin
  if not public.circle_chat_allowed(me, p_user_id) then
    raise exception 'chat_unavailable' using errcode = '42501';
  end if;
  update public.circle_messages set read_at = now()
    where sender_id = p_user_id and recipient_id = me and read_at is null and deleted_at is null;
  get diagnostics changed = row_count;
  return changed;
end $$;

create or replace function public.circle_chat_delete(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  update public.circle_messages set deleted_at = now()
    where id = p_message_id and sender_id = me and deleted_at is null;
  if not found then raise exception 'message_not_found' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.circle_chat_allowed(uuid, uuid) from public, anon, authenticated;
revoke all on function public.circle_message_visible(uuid, uuid) from public, anon, authenticated;
revoke all on function public.circle_chat_threads() from public, anon;
revoke all on function public.circle_chat_messages(uuid, timestamptz, integer) from public, anon;
revoke all on function public.circle_chat_send(uuid, text) from public, anon;
revoke all on function public.circle_chat_mark_read(uuid) from public, anon;
revoke all on function public.circle_chat_delete(uuid) from public, anon;
grant execute on function public.circle_chat_threads() to authenticated;
grant execute on function public.circle_message_visible(uuid, uuid) to authenticated;
grant execute on function public.circle_chat_messages(uuid, timestamptz, integer) to authenticated;
grant execute on function public.circle_chat_send(uuid, text) to authenticated;
grant execute on function public.circle_chat_mark_read(uuid) to authenticated;
grant execute on function public.circle_chat_delete(uuid) to authenticated;
