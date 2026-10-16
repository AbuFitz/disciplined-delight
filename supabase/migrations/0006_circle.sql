-- VAYVOR Circle: deliberate sharing, connections and kudos.
--
-- Privacy rules:
-- * Nothing from the private records/sync tables is copied or exposed here.
-- * A person must explicitly create every Circle post.
-- * Posts are visible only to the author and accepted connections.
-- * Email is never searchable. Discovery uses the public handle only.
-- * Direct writes are denied; the RPCs below validate the caller and payload.

create table if not exists public.circle_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.circle_connections (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high))
);

create table if not exists public.circle_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('training', 'milestone', 'routine', 'food', 'reflection')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text check (body is null or char_length(body) <= 500),
  metric_label text check (metric_label is null or char_length(metric_label) <= 40),
  metric_value text check (metric_value is null or char_length(metric_value) <= 40),
  source_date date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists circle_posts_author_created_idx
  on public.circle_posts(author_id, created_at desc) where deleted_at is null;

create table if not exists public.circle_kudos (
  post_id uuid not null references public.circle_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.circle_blocks enable row level security;
alter table public.circle_connections enable row level security;
alter table public.circle_posts enable row level security;
alter table public.circle_kudos enable row level security;

drop policy if exists "read own blocks" on public.circle_blocks;
create policy "read own blocks" on public.circle_blocks for select to authenticated
  using (blocker_id = auth.uid());
drop policy if exists "read own connections" on public.circle_connections;
create policy "read own connections" on public.circle_connections for select to authenticated
  using (auth.uid() in (user_low, user_high));
drop policy if exists "read connected posts" on public.circle_posts;
create policy "read connected posts" on public.circle_posts for select to authenticated using (
  author_id = auth.uid() or exists (
    select 1 from public.circle_connections c
    where c.status = 'accepted'
      and c.user_low = least(author_id, auth.uid())
      and c.user_high = greatest(author_id, auth.uid())
  )
);
drop policy if exists "read visible kudos" on public.circle_kudos;
create policy "read visible kudos" on public.circle_kudos for select to authenticated using (
  exists (select 1 from public.circle_posts p where p.id = post_id)
);

revoke all on public.circle_blocks, public.circle_connections, public.circle_posts, public.circle_kudos
  from public, anon, authenticated;
grant select on public.circle_blocks, public.circle_connections, public.circle_posts, public.circle_kudos
  to authenticated;

create or replace function public.circle_require_user()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'profile_required' using errcode = '23503';
  end if;
  return auth.uid();
end $$;

create or replace function public.circle_is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create or replace function public.circle_find_people(p_query text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  relationship text
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare q text := btrim(coalesce(p_query, ''));
begin
  if char_length(q) < 2 or char_length(q) > 40 then return; end if;
  return query
    select p.user_id, p.username, p.display_name, p.avatar_path,
      case
        when c.status = 'accepted' then 'connected'
        when c.status = 'pending' and c.requested_by = me then 'outgoing'
        when c.status = 'pending' then 'incoming'
        else 'none'
      end
    from public.profiles p
    left join public.circle_connections c
      on c.user_low = least(me, p.user_id) and c.user_high = greatest(me, p.user_id)
    where p.user_id <> me
      and not public.circle_is_blocked(me, p.user_id)
      and (
        left(lower(p.username), char_length(q)) = lower(q)
        or position(lower(q) in lower(p.display_name)) > 0
      )
    order by (lower(p.username) = lower(q)) desc, p.username
    limit 12;
end $$;

create or replace function public.circle_my_connections()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  relationship text,
  requested_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  return query
    select p.user_id, p.username, p.display_name, p.avatar_path,
      case
        when c.status = 'accepted' then 'connected'
        when c.requested_by = me then 'outgoing'
        else 'incoming'
      end,
      c.created_at
    from public.circle_connections c
    join public.profiles p on p.user_id = case when c.user_low = me then c.user_high else c.user_low end
    where me in (c.user_low, c.user_high)
      and not public.circle_is_blocked(me, p.user_id)
    order by case when c.status = 'pending' and c.requested_by <> me then 0 else 1 end,
             p.display_name, p.username;
end $$;

create or replace function public.circle_my_blocks()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  relationship text,
  requested_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  return query
    select p.user_id, p.username, p.display_name, p.avatar_path, 'blocked'::text, b.created_at
    from public.circle_blocks b
    join public.profiles p on p.user_id = b.blocked_id
    where b.blocker_id = me
    order by p.display_name, p.username;
end $$;

create or replace function public.circle_send_request(p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare lo uuid;
declare hi uuid;
declare existing public.circle_connections%rowtype;
begin
  if p_user_id is null or p_user_id = me then raise exception 'invalid_connection' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'person_not_found' using errcode = 'P0002';
  end if;
  if public.circle_is_blocked(me, p_user_id) then raise exception 'connection_unavailable' using errcode = '42501'; end if;
  lo := least(me, p_user_id); hi := greatest(me, p_user_id);
  select * into existing from public.circle_connections where user_low = lo and user_high = hi;
  if found then
    if existing.status = 'accepted' then return 'connected'; end if;
    if existing.requested_by = me then return 'outgoing'; end if;
    update public.circle_connections set status = 'accepted', updated_at = now()
      where user_low = lo and user_high = hi;
    return 'connected';
  end if;
  insert into public.circle_connections(user_low, user_high, requested_by)
    values (lo, hi, me);
  return 'outgoing';
end $$;

create or replace function public.circle_respond_request(p_user_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare lo uuid := least(me, p_user_id);
declare hi uuid := greatest(me, p_user_id);
begin
  if not exists (
    select 1 from public.circle_connections
    where user_low = lo and user_high = hi and status = 'pending' and requested_by = p_user_id
  ) then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  if p_accept then
    update public.circle_connections set status = 'accepted', updated_at = now()
      where user_low = lo and user_high = hi;
    return 'connected';
  end if;
  delete from public.circle_connections where user_low = lo and user_high = hi;
  return 'removed';
end $$;

create or replace function public.circle_remove_connection(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  delete from public.circle_connections
   where user_low = least(me, p_user_id) and user_high = greatest(me, p_user_id);
end $$;

create or replace function public.circle_block(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  if p_user_id is null or p_user_id = me then raise exception 'invalid_block' using errcode = '22023'; end if;
  insert into public.circle_blocks(blocker_id, blocked_id) values (me, p_user_id) on conflict do nothing;
  delete from public.circle_connections
   where user_low = least(me, p_user_id) and user_high = greatest(me, p_user_id);
end $$;

create or replace function public.circle_unblock(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  delete from public.circle_blocks where blocker_id = me and blocked_id = p_user_id;
end $$;

create or replace function public.circle_share(
  p_kind text,
  p_title text,
  p_body text default null,
  p_metric_label text default null,
  p_metric_value text default null,
  p_source_date date default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare new_id uuid;
begin
  if p_kind not in ('training', 'milestone', 'routine', 'food', 'reflection') then
    raise exception 'invalid_post_kind' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 80
     or char_length(coalesce(p_body, '')) > 500
     or char_length(coalesce(p_metric_label, '')) > 40
     or char_length(coalesce(p_metric_value, '')) > 40 then
    raise exception 'invalid_post' using errcode = '22023';
  end if;
  insert into public.circle_posts(author_id, kind, title, body, metric_label, metric_value, source_date)
    values (me, p_kind, btrim(p_title), nullif(btrim(p_body), ''),
            nullif(btrim(p_metric_label), ''), nullif(btrim(p_metric_value), ''), p_source_date)
    returning id into new_id;
  return new_id;
end $$;

create or replace function public.circle_delete_post(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  update public.circle_posts set deleted_at = now()
    where id = p_post_id and author_id = me and deleted_at is null;
  if not found then raise exception 'post_not_found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.circle_toggle_kudos(p_post_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  if not exists (
    select 1 from public.circle_posts p
    where p.id = p_post_id and p.deleted_at is null
      and p.author_id <> me
      and not public.circle_is_blocked(me, p.author_id)
      and (
        p.author_id = me or exists (
          select 1 from public.circle_connections c
          where c.status = 'accepted'
            and c.user_low = least(me, p.author_id)
            and c.user_high = greatest(me, p.author_id)
        )
      )
  ) then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  delete from public.circle_kudos where post_id = p_post_id and user_id = me;
  if found then return false; end if;
  insert into public.circle_kudos(post_id, user_id) values (p_post_id, me);
  return true;
end $$;

create or replace function public.circle_feed(p_before timestamptz default null, p_limit integer default 20)
returns table (
  id uuid,
  author_id uuid,
  username text,
  display_name text,
  avatar_path text,
  kind text,
  title text,
  body text,
  metric_label text,
  metric_value text,
  source_date date,
  created_at timestamptz,
  kudos_count bigint,
  kudos_mine boolean,
  mine boolean
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  return query
    select p.id, p.author_id, pr.username, pr.display_name, pr.avatar_path,
      p.kind, p.title, p.body, p.metric_label, p.metric_value, p.source_date, p.created_at,
      (select count(*) from public.circle_kudos k where k.post_id = p.id),
      exists (select 1 from public.circle_kudos k where k.post_id = p.id and k.user_id = me),
      p.author_id = me
    from public.circle_posts p
    join public.profiles pr on pr.user_id = p.author_id
    where p.deleted_at is null
      and (p_before is null or p.created_at < p_before)
      and not public.circle_is_blocked(me, p.author_id)
      and (
        p.author_id = me or exists (
          select 1 from public.circle_connections c
          where c.status = 'accepted'
            and c.user_low = least(me, p.author_id)
            and c.user_high = greatest(me, p.author_id)
        )
      )
    order by p.created_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

revoke all on function public.circle_require_user() from public, anon;
revoke all on function public.circle_is_blocked(uuid, uuid) from public, anon, authenticated;
revoke all on function public.circle_find_people(text) from public, anon;
revoke all on function public.circle_my_connections() from public, anon;
revoke all on function public.circle_my_blocks() from public, anon;
revoke all on function public.circle_send_request(uuid) from public, anon;
revoke all on function public.circle_respond_request(uuid, boolean) from public, anon;
revoke all on function public.circle_remove_connection(uuid) from public, anon;
revoke all on function public.circle_block(uuid) from public, anon;
revoke all on function public.circle_unblock(uuid) from public, anon;
revoke all on function public.circle_share(text, text, text, text, text, date) from public, anon;
revoke all on function public.circle_delete_post(uuid) from public, anon;
revoke all on function public.circle_toggle_kudos(uuid) from public, anon;
revoke all on function public.circle_feed(timestamptz, integer) from public, anon;

grant execute on function public.circle_find_people(text) to authenticated;
grant execute on function public.circle_my_connections() to authenticated;
grant execute on function public.circle_my_blocks() to authenticated;
grant execute on function public.circle_send_request(uuid) to authenticated;
grant execute on function public.circle_respond_request(uuid, boolean) to authenticated;
grant execute on function public.circle_remove_connection(uuid) to authenticated;
grant execute on function public.circle_block(uuid) to authenticated;
grant execute on function public.circle_unblock(uuid) to authenticated;
grant execute on function public.circle_share(text, text, text, text, text, date) to authenticated;
grant execute on function public.circle_delete_post(uuid) to authenticated;
grant execute on function public.circle_toggle_kudos(uuid) to authenticated;
grant execute on function public.circle_feed(timestamptz, integer) to authenticated;
