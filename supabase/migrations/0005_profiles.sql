-- VAYVOR: public identity (handle, display name, avatar, timezone).
--
-- * Email addresses are never stored here and are never a social identifier.
-- * The stable identifier everywhere is user_id; the username can change without breaking friendships,
--   messages or medals (they reference user_id).
-- * Usernames are unique case-insensitively, enforced by a unique index, so concurrent claims are settled by
--   the database. The availability check is only a UI convenience.
-- * Clients cannot write this table directly: only the functions below, which check the caller.

create table if not exists public.profiles (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  username     text        not null check (username ~ '^[A-Za-z][A-Za-z0-9_]{2,19}$'),
  display_name text        not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_path  text        check (avatar_path is null or char_length(avatar_path) <= 300),
  timezone     text        not null default 'Europe/London' check (char_length(timezone) between 1 and 64),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = user_id);

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

create or replace function public.is_reserved_username(p text)
returns boolean language sql immutable as $$
  select lower(p) = any (array[
    'admin','administrator','support','help','newlife','new_life','vayvor','vayvorhq','moderator','mod','system','root',
    'staff','official','null','undefined','anonymous','everyone','me','you'
  ])
$$;

create or replace function public.username_available(p_username text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_username is null or p_username !~ '^[A-Za-z][A-Za-z0-9_]{2,19}$' or public.is_reserved_username(p_username) then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles where lower(username) = lower(p_username) and user_id <> auth.uid()
  );
end $$;

create or replace function public.my_profile()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into r from public.profiles where user_id = auth.uid();
  if not found then return null; end if;
  return jsonb_build_object('user_id', r.user_id, 'username', r.username, 'display_name', r.display_name,
                            'avatar_path', r.avatar_path, 'timezone', r.timezone);
end $$;

create or replace function public.create_profile(p_username text, p_display_name text, p_timezone text default 'Europe/London')
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_username is null or p_username !~ '^[A-Za-z][A-Za-z0-9_]{2,19}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;
  if public.is_reserved_username(p_username) then raise exception 'username_reserved' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'profile_exists' using errcode = '23505';
  end if;
  begin
    insert into public.profiles (user_id, username, display_name, timezone)
    values (auth.uid(), p_username, btrim(p_display_name), coalesce(nullif(btrim(p_timezone), ''), 'Europe/London'));
  exception when unique_violation then
    raise exception 'username_taken' using errcode = '23505';
  end;
  return public.my_profile();
end $$;

create or replace function public.update_profile(p_display_name text default null, p_timezone text default null, p_avatar_path text default null, p_username text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_username is not null then
    if p_username !~ '^[A-Za-z][A-Za-z0-9_]{2,19}$' then raise exception 'invalid_username' using errcode = '22023'; end if;
    if public.is_reserved_username(p_username) then raise exception 'username_reserved' using errcode = '22023'; end if;
  end if;
  begin
    update public.profiles
       set username = coalesce(p_username, username),
           display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
           timezone = coalesce(nullif(btrim(p_timezone), ''), timezone),
           avatar_path = coalesce(p_avatar_path, avatar_path),
           updated_at = now()
     where user_id = auth.uid();
  exception when unique_violation then
    raise exception 'username_taken' using errcode = '23505';
  end;
  return public.my_profile();
end $$;

revoke all on function public.is_reserved_username(text) from public, anon;
revoke all on function public.username_available(text) from public, anon;
revoke all on function public.my_profile() from public, anon;
revoke all on function public.create_profile(text, text, text) from public, anon;
revoke all on function public.update_profile(text, text, text, text) from public, anon;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.create_profile(text, text, text) to authenticated;
grant execute on function public.update_profile(text, text, text, text) to authenticated;
