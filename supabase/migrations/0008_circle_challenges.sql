-- VAYVOR Circle challenges: private, consent-based accountability pacts.
-- Progress is explicitly self-reported. No workout, food, prayer, mood or journal record is read or copied.

create table if not exists public.circle_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  invited_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  unit text not null check (char_length(btrim(unit)) between 1 and 24),
  target integer not null check (target between 1 and 100),
  starts_on date not null default current_date,
  ends_on date not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'declined', 'closed')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  closed_at timestamptz,
  check (creator_id <> invited_id),
  check (ends_on >= starts_on + 1 and ends_on <= starts_on + 42)
);
create index if not exists circle_challenges_people_idx
  on public.circle_challenges(creator_id, invited_id, created_at desc);

create table if not exists public.circle_challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.circle_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount between 1 and 10),
  note text check (note is null or char_length(note) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists circle_challenge_entries_challenge_idx
  on public.circle_challenge_entries(challenge_id, created_at desc);

create or replace function public.circle_challenge_visible(p_challenge_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_challenges c
    where c.id = p_challenge_id
      and auth.uid() in (c.creator_id, c.invited_id)
      and not public.circle_is_blocked(c.creator_id, c.invited_id)
      and exists (
        select 1 from public.circle_connections connection
        where connection.status = 'accepted'
          and connection.user_low = least(c.creator_id, c.invited_id)
          and connection.user_high = greatest(c.creator_id, c.invited_id)
      )
  )
$$;

alter table public.circle_challenges enable row level security;
alter table public.circle_challenge_entries enable row level security;
drop policy if exists "read own visible challenges" on public.circle_challenges;
create policy "read own visible challenges" on public.circle_challenges for select to authenticated
  using (public.circle_challenge_visible(id));
drop policy if exists "read own visible challenge entries" on public.circle_challenge_entries;
create policy "read own visible challenge entries" on public.circle_challenge_entries for select to authenticated
  using (public.circle_challenge_visible(challenge_id));
revoke all on public.circle_challenges, public.circle_challenge_entries from public, anon, authenticated;
grant select on public.circle_challenges, public.circle_challenge_entries to authenticated;

create or replace function public.circle_challenge_create(
  p_user_id uuid, p_title text, p_unit text, p_target integer, p_ends_on date
) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare new_id uuid;
begin
  if not public.circle_chat_allowed(me, p_user_id) then
    raise exception 'connection_unavailable' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 60
    or char_length(btrim(coalesce(p_unit, ''))) not between 1 and 24
    or coalesce(p_target, 0) not between 1 and 100
    or p_ends_on is null or p_ends_on < current_date + 1 or p_ends_on > current_date + 42 then
    raise exception 'invalid_challenge' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.circle_challenges c
    where me in (c.creator_id, c.invited_id) and p_user_id in (c.creator_id, c.invited_id)
      and c.status = 'pending'
  ) then raise exception 'challenge_pending' using errcode = '23505'; end if;
  insert into public.circle_challenges(creator_id, invited_id, title, unit, target, ends_on)
    values (me, p_user_id, btrim(p_title), btrim(p_unit), p_target, p_ends_on)
    returning id into new_id;
  return new_id;
end $$;

create or replace function public.circle_challenge_respond(p_challenge_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare next_status text := case when p_accept then 'active' else 'declined' end;
begin
  update public.circle_challenges set status = next_status, responded_at = now()
    where id = p_challenge_id and invited_id = me and status = 'pending'
      and not public.circle_is_blocked(creator_id, invited_id)
      and exists (
        select 1 from public.circle_connections c
        where c.status = 'accepted'
          and c.user_low = least(creator_id, invited_id)
          and c.user_high = greatest(creator_id, invited_id)
      );
  if not found then raise exception 'challenge_unavailable' using errcode = 'P0002'; end if;
  return next_status;
end $$;

create or replace function public.circle_challenges()
returns table (
  id uuid, other_user_id uuid, other_username text, other_display_name text,
  title text, unit text, target integer, starts_on date, ends_on date, status text,
  created_at timestamptz, invited_me boolean, mine_progress bigint, their_progress bigint
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  return query
    select c.id, p.user_id, p.username, p.display_name, c.title, c.unit, c.target,
      c.starts_on, c.ends_on, c.status, c.created_at, c.invited_id = me,
      coalesce(sum(e.amount) filter (where e.user_id = me), 0),
      coalesce(sum(e.amount) filter (where e.user_id = p.user_id), 0)
    from public.circle_challenges c
    join public.profiles p on p.user_id = case when c.creator_id = me then c.invited_id else c.creator_id end
    left join public.circle_challenge_entries e on e.challenge_id = c.id
    where me in (c.creator_id, c.invited_id)
      and not public.circle_is_blocked(c.creator_id, c.invited_id)
      and exists (
        select 1 from public.circle_connections connection
        where connection.status = 'accepted'
          and connection.user_low = least(c.creator_id, c.invited_id)
          and connection.user_high = greatest(c.creator_id, c.invited_id)
      )
    group by c.id, p.user_id, p.username, p.display_name
    order by case c.status when 'active' then 0 when 'pending' then 1 else 2 end, c.created_at desc;
end $$;

create or replace function public.circle_challenge_entries(p_challenge_id uuid)
returns table (
  id uuid, user_id uuid, display_name text, amount integer, note text,
  created_at timestamptz, mine boolean
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  if not public.circle_challenge_visible(p_challenge_id) then
    raise exception 'challenge_unavailable' using errcode = '42501';
  end if;
  return query select e.id, e.user_id, p.display_name, e.amount, e.note, e.created_at, e.user_id = me
    from public.circle_challenge_entries e join public.profiles p on p.user_id = e.user_id
    where e.challenge_id = p_challenge_id order by e.created_at desc limit 100;
end $$;

create or replace function public.circle_challenge_add(p_challenge_id uuid, p_amount integer, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare challenge public.circle_challenges%rowtype;
declare current_total integer;
declare new_id uuid;
begin
  select * into challenge from public.circle_challenges where id = p_challenge_id for update;
  if not found or me not in (challenge.creator_id, challenge.invited_id)
    or challenge.status <> 'active' or current_date > challenge.ends_on
    or not public.circle_chat_allowed(
      me,
      case when me = challenge.creator_id then challenge.invited_id else challenge.creator_id end
    ) then
    raise exception 'challenge_unavailable' using errcode = '42501';
  end if;
  if p_amount not between 1 and 10 or char_length(coalesce(p_note, '')) > 120 then
    raise exception 'invalid_progress' using errcode = '22023';
  end if;
  select coalesce(sum(amount), 0) into current_total from public.circle_challenge_entries
    where challenge_id = p_challenge_id and user_id = me;
  if current_total + p_amount > challenge.target then
    raise exception 'progress_exceeds_target' using errcode = '22023';
  end if;
  insert into public.circle_challenge_entries(challenge_id, user_id, amount, note)
    values (p_challenge_id, me, p_amount, nullif(btrim(coalesce(p_note, '')), ''))
    returning id into new_id;
  return new_id;
end $$;

create or replace function public.circle_challenge_delete_entry(p_entry_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  delete from public.circle_challenge_entries where id = p_entry_id and user_id = me;
  if not found then raise exception 'progress_not_found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.circle_challenge_close(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  update public.circle_challenges set status = 'closed', closed_at = now()
    where id = p_challenge_id and me in (creator_id, invited_id) and status in ('pending', 'active');
  if not found then raise exception 'challenge_unavailable' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.circle_challenge_visible(uuid) from public, anon, authenticated;
revoke all on function public.circle_challenge_create(uuid, text, text, integer, date) from public, anon;
revoke all on function public.circle_challenge_respond(uuid, boolean) from public, anon;
revoke all on function public.circle_challenges() from public, anon;
revoke all on function public.circle_challenge_entries(uuid) from public, anon;
revoke all on function public.circle_challenge_add(uuid, integer, text) from public, anon;
revoke all on function public.circle_challenge_delete_entry(uuid) from public, anon;
revoke all on function public.circle_challenge_close(uuid) from public, anon;
grant execute on function public.circle_challenge_visible(uuid) to authenticated;
grant execute on function public.circle_challenge_create(uuid, text, text, integer, date) to authenticated;
grant execute on function public.circle_challenge_respond(uuid, boolean) to authenticated;
grant execute on function public.circle_challenges() to authenticated;
grant execute on function public.circle_challenge_entries(uuid) to authenticated;
grant execute on function public.circle_challenge_add(uuid, integer, text) to authenticated;
grant execute on function public.circle_challenge_delete_entry(uuid) to authenticated;
grant execute on function public.circle_challenge_close(uuid) to authenticated;
