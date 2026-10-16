-- VAYVOR Circle crews: small, invitation-only accountability rooms.
-- Roll calls are deliberate self-reports. No workout, food, prayer, mood or journal record is read or copied.

create table if not exists public.circle_crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 40),
  purpose text not null check (char_length(btrim(purpose)) between 10 and 160),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists circle_crews_owner_idx on public.circle_crews(owner_id, updated_at desc);

create table if not exists public.circle_crew_members (
  crew_id uuid not null references public.circle_crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'declined', 'left', 'removed')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index if not exists circle_crew_members_user_idx
  on public.circle_crew_members(user_id, status, updated_at desc);

create table if not exists public.circle_crew_checkins (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.circle_crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_on date not null,
  state text not null check (state in ('showed_up', 'adjusted', 'rested')),
  note text check (note is null or char_length(note) <= 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (crew_id, user_id, week_on)
);
create index if not exists circle_crew_checkins_week_idx
  on public.circle_crew_checkins(crew_id, week_on desc, updated_at desc);

create or replace function public.circle_crew_visible(p_crew_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_crews crew
    join public.circle_crew_members member on member.crew_id = crew.id
    where crew.id = p_crew_id and crew.status = 'active'
      and member.user_id = auth.uid() and member.status in ('pending', 'active')
      and not public.circle_is_blocked(auth.uid(), crew.owner_id)
  )
$$;

create or replace function public.circle_crew_active_member(p_crew_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_crews crew
    join public.circle_crew_members member on member.crew_id = crew.id
    where crew.id = p_crew_id and crew.status = 'active'
      and member.user_id = p_user_id and member.status = 'active'
      and not public.circle_is_blocked(p_user_id, crew.owner_id)
  )
$$;

alter table public.circle_crews enable row level security;
alter table public.circle_crew_members enable row level security;
alter table public.circle_crew_checkins enable row level security;

drop policy if exists "read visible crews" on public.circle_crews;
create policy "read visible crews" on public.circle_crews for select to authenticated
  using (public.circle_crew_visible(id));
drop policy if exists "read visible crew members" on public.circle_crew_members;
create policy "read visible crew members" on public.circle_crew_members for select to authenticated
  using (
    public.circle_crew_visible(crew_id)
    and not public.circle_is_blocked(auth.uid(), user_id)
    and (
      status = 'active' or user_id = auth.uid()
      or exists (
        select 1 from public.circle_crews crew
        where crew.id = crew_id and crew.owner_id = auth.uid()
      )
    )
  );
drop policy if exists "read visible crew checkins" on public.circle_crew_checkins;
create policy "read visible crew checkins" on public.circle_crew_checkins for select to authenticated
  using (
    public.circle_crew_active_member(crew_id, auth.uid())
    and not public.circle_is_blocked(auth.uid(), user_id)
  );
revoke all on public.circle_crews, public.circle_crew_members, public.circle_crew_checkins
  from public, anon, authenticated;
grant select on public.circle_crews, public.circle_crew_members, public.circle_crew_checkins
  to authenticated;

-- Removing or blocking the owner's connection removes that member from the crew. Blocks between two ordinary
-- members are handled by the visibility filters, so neither sees the other's roster entry or roll call.
create or replace function public.circle_crew_connection_removed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.circle_crew_members member set status = 'removed', updated_at = now()
  from public.circle_crews crew
  where member.crew_id = crew.id and member.status in ('pending', 'active')
    and (
      (crew.owner_id = old.user_low and member.user_id = old.user_high)
      or (crew.owner_id = old.user_high and member.user_id = old.user_low)
    );
  return old;
end $$;
drop trigger if exists circle_crew_connection_removed on public.circle_connections;
create trigger circle_crew_connection_removed after delete on public.circle_connections
  for each row execute function public.circle_crew_connection_removed();

create or replace function public.circle_crew_create(
  p_name text, p_purpose text, p_invitee_ids uuid[] default array[]::uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare new_id uuid;
declare invitee uuid;
declare invitees uuid[] := coalesce(p_invitee_ids, array[]::uuid[]);
begin
  if not exists (select 1 from public.profiles where user_id = me) then
    raise exception 'profile_required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 3 and 40
    or char_length(btrim(coalesce(p_purpose, ''))) not between 10 and 160
    or cardinality(invitees) > 11 or me = any(invitees)
    or (select count(distinct value) from unnest(invitees) value) <> cardinality(invitees) then
    raise exception 'invalid_crew' using errcode = '22023';
  end if;
  foreach invitee in array invitees loop
    if not public.circle_chat_allowed(me, invitee) then
      raise exception 'connection_unavailable' using errcode = '42501';
    end if;
  end loop;
  insert into public.circle_crews(owner_id, name, purpose)
    values (me, btrim(p_name), btrim(p_purpose)) returning id into new_id;
  insert into public.circle_crew_members(
    crew_id, user_id, invited_by, role, status, joined_at
  ) values (new_id, me, me, 'owner', 'active', now());
  foreach invitee in array invitees loop
    insert into public.circle_crew_members(crew_id, user_id, invited_by)
      values (new_id, invitee, me);
  end loop;
  return new_id;
end $$;

create or replace function public.circle_crews()
returns table (
  id uuid, name text, purpose text, owner_id uuid, owner_username text,
  owner_display_name text, my_role text, my_status text, active_count bigint,
  pending_count bigint, created_at timestamptz, updated_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  return query
    select crew.id, crew.name, crew.purpose, crew.owner_id, profile.username,
      profile.display_name, mine.role, mine.status,
      (
        select count(*) from public.circle_crew_members member
        where member.crew_id = crew.id and member.status = 'active'
          and not public.circle_is_blocked(me, member.user_id)
      ),
      case when crew.owner_id = me then (
        select count(*) from public.circle_crew_members member
        where member.crew_id = crew.id and member.status = 'pending'
      ) else 0 end,
      crew.created_at, crew.updated_at
    from public.circle_crews crew
    join public.circle_crew_members mine on mine.crew_id = crew.id and mine.user_id = me
    join public.profiles profile on profile.user_id = crew.owner_id
    where crew.status = 'active' and mine.status in ('pending', 'active')
      and not public.circle_is_blocked(me, crew.owner_id)
    order by case mine.status when 'pending' then 0 else 1 end, crew.updated_at desc;
end $$;

create or replace function public.circle_crew_members(p_crew_id uuid)
returns table (
  user_id uuid, username text, display_name text, avatar_path text,
  role text, status text, mine boolean, joined_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare owner uuid;
begin
  if not public.circle_crew_visible(p_crew_id) then
    raise exception 'crew_unavailable' using errcode = '42501';
  end if;
  select owner_id into owner from public.circle_crews where id = p_crew_id;
  return query
    select profile.user_id, profile.username, profile.display_name, profile.avatar_path,
      member.role, member.status, member.user_id = me, member.joined_at
    from public.circle_crew_members member
    join public.profiles profile on profile.user_id = member.user_id
    where member.crew_id = p_crew_id
      and (member.status = 'active' or member.user_id = me or owner = me)
      and member.status not in ('declined', 'left', 'removed')
      and not public.circle_is_blocked(me, member.user_id)
    order by case member.role when 'owner' then 0 else 1 end, profile.display_name, profile.username;
end $$;

create or replace function public.circle_crew_respond(p_crew_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare crew public.circle_crews%rowtype;
declare next_status text := case when p_accept then 'active' else 'declined' end;
begin
  select * into crew from public.circle_crews where id = p_crew_id and status = 'active' for update;
  if not found or not exists (
    select 1 from public.circle_crew_members
    where crew_id = p_crew_id and user_id = me and status = 'pending'
  ) then raise exception 'crew_unavailable' using errcode = 'P0002'; end if;
  if p_accept and not public.circle_chat_allowed(me, crew.owner_id) then
    raise exception 'connection_unavailable' using errcode = '42501';
  end if;
  update public.circle_crew_members set status = next_status,
    joined_at = case when p_accept then now() else null end, updated_at = now()
    where crew_id = p_crew_id and user_id = me and status = 'pending';
  update public.circle_crews set updated_at = now() where id = p_crew_id;
  return next_status;
end $$;

create or replace function public.circle_crew_invite(p_crew_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare crew public.circle_crews%rowtype;
declare member_count integer;
begin
  select * into crew from public.circle_crews where id = p_crew_id and status = 'active' for update;
  if not found or crew.owner_id <> me then
    raise exception 'crew_owner_required' using errcode = '42501';
  end if;
  if not public.circle_chat_allowed(me, p_user_id) then
    raise exception 'connection_unavailable' using errcode = '42501';
  end if;
  select count(*) into member_count from public.circle_crew_members
    where crew_id = p_crew_id and status in ('pending', 'active');
  if member_count >= 12 then raise exception 'crew_full' using errcode = '22023'; end if;
  insert into public.circle_crew_members(crew_id, user_id, invited_by)
    values (p_crew_id, p_user_id, me)
  on conflict (crew_id, user_id) do update set status = 'pending', invited_by = me,
    invited_at = now(), joined_at = null, updated_at = now()
    where circle_crew_members.status in ('declined', 'left', 'removed');
  if not found then raise exception 'member_unavailable' using errcode = '23505'; end if;
  update public.circle_crews set updated_at = now() where id = p_crew_id;
end $$;

create or replace function public.circle_crew_remove_member(p_crew_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare crew public.circle_crews%rowtype;
begin
  select * into crew from public.circle_crews where id = p_crew_id and status = 'active';
  if not found or crew.owner_id <> me then
    raise exception 'crew_owner_required' using errcode = '42501';
  end if;
  update public.circle_crew_members set status = 'removed', updated_at = now()
    where crew_id = p_crew_id and user_id = p_user_id and role <> 'owner'
      and status in ('pending', 'active');
  if not found then raise exception 'member_unavailable' using errcode = 'P0002'; end if;
  update public.circle_crews set updated_at = now() where id = p_crew_id;
end $$;

create or replace function public.circle_crew_leave(p_crew_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  update public.circle_crew_members set status = 'left', updated_at = now()
    where crew_id = p_crew_id and user_id = me and role = 'member' and status = 'active';
  if not found then raise exception 'member_unavailable' using errcode = 'P0002'; end if;
  update public.circle_crews set updated_at = now() where id = p_crew_id;
end $$;

create or replace function public.circle_crew_archive(p_crew_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  update public.circle_crews set status = 'archived', archived_at = now(), updated_at = now()
    where id = p_crew_id and owner_id = me and status = 'active';
  if not found then raise exception 'crew_owner_required' using errcode = '42501'; end if;
end $$;

create or replace function public.circle_crew_checkin(
  p_crew_id uuid, p_state text, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare week_start date := current_date - (extract(isodow from current_date)::integer - 1);
declare checkin_id uuid;
begin
  if not public.circle_crew_active_member(p_crew_id, me) then
    raise exception 'crew_unavailable' using errcode = '42501';
  end if;
  if coalesce(p_state, '') not in ('showed_up', 'adjusted', 'rested')
    or char_length(coalesce(p_note, '')) > 180 then
    raise exception 'invalid_checkin' using errcode = '22023';
  end if;
  insert into public.circle_crew_checkins(crew_id, user_id, week_on, state, note)
    values (p_crew_id, me, week_start, p_state, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (crew_id, user_id, week_on) do update set
    state = excluded.state, note = excluded.note, updated_at = now()
  returning id into checkin_id;
  update public.circle_crews set updated_at = now() where id = p_crew_id;
  return checkin_id;
end $$;

create or replace function public.circle_crew_checkin_delete(p_crew_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare week_start date := current_date - (extract(isodow from current_date)::integer - 1);
begin
  delete from public.circle_crew_checkins
    where crew_id = p_crew_id and user_id = me and week_on = week_start;
  if not found then raise exception 'member_unavailable' using errcode = 'P0002'; end if;
  update public.circle_crews set updated_at = now() where id = p_crew_id;
end $$;

create or replace function public.circle_crew_checkins(p_crew_id uuid)
returns table (
  id uuid, user_id uuid, username text, display_name text, state text,
  note text, week_on date, mine boolean, updated_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare week_start date := current_date - (extract(isodow from current_date)::integer - 1);
begin
  if not public.circle_crew_active_member(p_crew_id, me) then
    raise exception 'crew_unavailable' using errcode = '42501';
  end if;
  return query
    select checkin.id, profile.user_id, profile.username, profile.display_name,
      checkin.state, checkin.note, checkin.week_on, checkin.user_id = me, checkin.updated_at
    from public.circle_crew_checkins checkin
    join public.profiles profile on profile.user_id = checkin.user_id
    where checkin.crew_id = p_crew_id and checkin.week_on = week_start
      and not public.circle_is_blocked(me, checkin.user_id)
    order by checkin.updated_at desc;
end $$;

revoke all on function public.circle_crew_visible(uuid) from public, anon, authenticated;
revoke all on function public.circle_crew_active_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.circle_crew_connection_removed() from public, anon, authenticated;
revoke all on function public.circle_crew_create(text, text, uuid[]) from public, anon;
revoke all on function public.circle_crews() from public, anon;
revoke all on function public.circle_crew_members(uuid) from public, anon;
revoke all on function public.circle_crew_respond(uuid, boolean) from public, anon;
revoke all on function public.circle_crew_invite(uuid, uuid) from public, anon;
revoke all on function public.circle_crew_remove_member(uuid, uuid) from public, anon;
revoke all on function public.circle_crew_leave(uuid) from public, anon;
revoke all on function public.circle_crew_archive(uuid) from public, anon;
revoke all on function public.circle_crew_checkin(uuid, text, text) from public, anon;
revoke all on function public.circle_crew_checkin_delete(uuid) from public, anon;
revoke all on function public.circle_crew_checkins(uuid) from public, anon;
grant execute on function public.circle_crew_visible(uuid) to authenticated;
grant execute on function public.circle_crew_active_member(uuid, uuid) to authenticated;
grant execute on function public.circle_crew_create(text, text, uuid[]) to authenticated;
grant execute on function public.circle_crews() to authenticated;
grant execute on function public.circle_crew_members(uuid) to authenticated;
grant execute on function public.circle_crew_respond(uuid, boolean) to authenticated;
grant execute on function public.circle_crew_invite(uuid, uuid) to authenticated;
grant execute on function public.circle_crew_remove_member(uuid, uuid) to authenticated;
grant execute on function public.circle_crew_leave(uuid) to authenticated;
grant execute on function public.circle_crew_archive(uuid) to authenticated;
grant execute on function public.circle_crew_checkin(uuid, text, text) to authenticated;
grant execute on function public.circle_crew_checkin_delete(uuid) to authenticated;
grant execute on function public.circle_crew_checkins(uuid) to authenticated;
