-- VAYVOR Circle Four in a Row: connection-only games with self-authored stakes.
-- The board, turns and wins are server-validated. No private fitness or wellbeing records are read.

create table if not exists public.circle_four_games (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  invited_id uuid not null references auth.users(id) on delete cascade,
  board smallint[] not null default array_fill(0::smallint, array[42]),
  current_turn_id uuid references auth.users(id) on delete set null,
  winner_id uuid references auth.users(id) on delete set null,
  creator_dare text not null check (char_length(btrim(creator_dare)) between 4 and 120),
  invited_dare text check (invited_dare is null or char_length(btrim(invited_dare)) between 4 and 120),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'won', 'draw', 'declined', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  finished_at timestamptz,
  check (creator_id <> invited_id),
  check (cardinality(board) = 42 and board <@ array[0, 1, 2]::smallint[]),
  check (winner_id is null or winner_id in (creator_id, invited_id)),
  check (current_turn_id is null or current_turn_id in (creator_id, invited_id))
);
create index if not exists circle_four_people_idx
  on public.circle_four_games(creator_id, invited_id, updated_at desc);
create unique index if not exists circle_four_one_open_pair_idx
  on public.circle_four_games(least(creator_id, invited_id), greatest(creator_id, invited_id))
  where status in ('pending', 'active');

create or replace function public.circle_four_winner(p_board smallint[])
returns smallint language plpgsql immutable set search_path = public as $$
declare
  row_index integer;
  column_index integer;
  token smallint;
begin
  if cardinality(p_board) <> 42 then return 0; end if;
  for row_index in 0..5 loop
    for column_index in 0..6 loop
      token := p_board[row_index * 7 + column_index + 1];
      if token = 0 then continue; end if;
      if column_index <= 3
        and p_board[row_index * 7 + column_index + 2] = token
        and p_board[row_index * 7 + column_index + 3] = token
        and p_board[row_index * 7 + column_index + 4] = token then return token; end if;
      if row_index <= 2
        and p_board[(row_index + 1) * 7 + column_index + 1] = token
        and p_board[(row_index + 2) * 7 + column_index + 1] = token
        and p_board[(row_index + 3) * 7 + column_index + 1] = token then return token; end if;
      if row_index <= 2 and column_index <= 3
        and p_board[(row_index + 1) * 7 + column_index + 2] = token
        and p_board[(row_index + 2) * 7 + column_index + 3] = token
        and p_board[(row_index + 3) * 7 + column_index + 4] = token then return token; end if;
      if row_index <= 2 and column_index >= 3
        and p_board[(row_index + 1) * 7 + column_index] = token
        and p_board[(row_index + 2) * 7 + column_index - 1] = token
        and p_board[(row_index + 3) * 7 + column_index - 2] = token then return token; end if;
    end loop;
  end loop;
  return 0;
end $$;

create or replace function public.circle_four_visible(p_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_four_games game
    where game.id = p_game_id
      and auth.uid() in (game.creator_id, game.invited_id)
      and not public.circle_is_blocked(game.creator_id, game.invited_id)
      and exists (
        select 1 from public.circle_connections connection
        where connection.status = 'accepted'
          and connection.user_low = least(game.creator_id, game.invited_id)
          and connection.user_high = greatest(game.creator_id, game.invited_id)
      )
  )
$$;

alter table public.circle_four_games enable row level security;
drop policy if exists "read own visible four games" on public.circle_four_games;
create policy "read own visible four games" on public.circle_four_games for select to authenticated
  using (public.circle_four_visible(id));
revoke all on public.circle_four_games from public, anon, authenticated;
grant select on public.circle_four_games to authenticated;

create or replace function public.circle_four_create(p_user_id uuid, p_creator_dare text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare new_id uuid;
begin
  if not public.circle_chat_allowed(me, p_user_id) then
    raise exception 'connection_unavailable' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_creator_dare, ''))) not between 4 and 120 then
    raise exception 'invalid_dare' using errcode = '22023';
  end if;
  begin
    insert into public.circle_four_games(creator_id, invited_id, creator_dare)
      values (me, p_user_id, btrim(p_creator_dare)) returning id into new_id;
  exception when unique_violation then
    raise exception 'game_open' using errcode = '23505';
  end;
  return new_id;
end $$;

create or replace function public.circle_four_respond(
  p_game_id uuid, p_accept boolean, p_invited_dare text default null
) returns text language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare next_status text := case when p_accept then 'active' else 'declined' end;
begin
  if p_accept and char_length(btrim(coalesce(p_invited_dare, ''))) not between 4 and 120 then
    raise exception 'invalid_dare' using errcode = '22023';
  end if;
  update public.circle_four_games
    set status = next_status,
      invited_dare = case when p_accept then btrim(p_invited_dare) else null end,
      current_turn_id = case when p_accept then creator_id else null end,
      responded_at = now(), updated_at = now(),
      finished_at = case when p_accept then null else now() end
    where id = p_game_id and invited_id = me and status = 'pending'
      and not public.circle_is_blocked(creator_id, invited_id)
      and exists (
        select 1 from public.circle_connections connection
        where connection.status = 'accepted'
          and connection.user_low = least(creator_id, invited_id)
          and connection.user_high = greatest(creator_id, invited_id)
      );
  if not found then raise exception 'game_unavailable' using errcode = 'P0002'; end if;
  return next_status;
end $$;

create or replace function public.circle_four_games()
returns table (
  id uuid, other_user_id uuid, other_username text, other_display_name text,
  board smallint[], mine_token smallint, current_turn_id uuid, winner_id uuid,
  status text, invited_me boolean, my_turn boolean, creator_dare text,
  invited_dare text, created_at timestamptz, updated_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  return query
    select game.id, profile.user_id, profile.username, profile.display_name, game.board,
      case when game.creator_id = me then 1::smallint else 2::smallint end,
      game.current_turn_id, game.winner_id, game.status, game.invited_id = me,
      game.current_turn_id = me and game.status = 'active', game.creator_dare,
      game.invited_dare, game.created_at, game.updated_at
    from public.circle_four_games game
    join public.profiles profile
      on profile.user_id = case when game.creator_id = me then game.invited_id else game.creator_id end
    where me in (game.creator_id, game.invited_id)
      and not public.circle_is_blocked(game.creator_id, game.invited_id)
      and exists (
        select 1 from public.circle_connections connection
        where connection.status = 'accepted'
          and connection.user_low = least(game.creator_id, game.invited_id)
          and connection.user_high = greatest(game.creator_id, game.invited_id)
      )
    order by case game.status when 'active' then 0 when 'pending' then 1 else 2 end,
      game.updated_at desc;
end $$;

create or replace function public.circle_four_move(p_game_id uuid, p_column integer)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
declare game public.circle_four_games%rowtype;
declare next_board smallint[];
declare token smallint;
declare row_index integer;
declare cell_index integer := 0;
declare winner_token smallint;
declare next_status text := 'active';
begin
  select * into game from public.circle_four_games where id = p_game_id for update;
  if not found or me not in (game.creator_id, game.invited_id) or game.status <> 'active'
    or not public.circle_chat_allowed(
      me, case when me = game.creator_id then game.invited_id else game.creator_id end
    ) then raise exception 'game_unavailable' using errcode = '42501'; end if;
  if game.current_turn_id <> me then raise exception 'not_your_turn' using errcode = '42501'; end if;
  if p_column is null or p_column not between 0 and 6 then
    raise exception 'invalid_column' using errcode = '22023';
  end if;

  next_board := game.board;
  for row_index in reverse 5..0 loop
    if next_board[row_index * 7 + p_column + 1] = 0 then
      cell_index := row_index * 7 + p_column + 1;
      exit;
    end if;
  end loop;
  if cell_index = 0 then raise exception 'column_full' using errcode = '22023'; end if;

  token := case when me = game.creator_id then 1::smallint else 2::smallint end;
  next_board[cell_index] := token;
  winner_token := public.circle_four_winner(next_board);
  if winner_token <> 0 then
    next_status := 'won';
    update public.circle_four_games set board = next_board, status = next_status,
      winner_id = me, current_turn_id = null, finished_at = now(), updated_at = now()
      where id = p_game_id;
  elsif array_position(next_board, 0::smallint) is null then
    next_status := 'draw';
    update public.circle_four_games set board = next_board, status = next_status,
      current_turn_id = null, finished_at = now(), updated_at = now()
      where id = p_game_id;
  else
    update public.circle_four_games set board = next_board,
      current_turn_id = case when me = game.creator_id then game.invited_id else game.creator_id end,
      updated_at = now() where id = p_game_id;
  end if;
  return next_status;
end $$;

create or replace function public.circle_four_close(p_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := public.circle_require_user();
begin
  update public.circle_four_games set status = 'closed', current_turn_id = null,
    finished_at = now(), updated_at = now()
    where id = p_game_id and me in (creator_id, invited_id) and status in ('pending', 'active');
  if not found then raise exception 'game_unavailable' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.circle_four_winner(smallint[]) from public, anon, authenticated;
revoke all on function public.circle_four_visible(uuid) from public, anon, authenticated;
revoke all on function public.circle_four_create(uuid, text) from public, anon;
revoke all on function public.circle_four_respond(uuid, boolean, text) from public, anon;
revoke all on function public.circle_four_games() from public, anon;
revoke all on function public.circle_four_move(uuid, integer) from public, anon;
revoke all on function public.circle_four_close(uuid) from public, anon;
grant execute on function public.circle_four_visible(uuid) to authenticated;
grant execute on function public.circle_four_create(uuid, text) to authenticated;
grant execute on function public.circle_four_respond(uuid, boolean, text) to authenticated;
grant execute on function public.circle_four_games() to authenticated;
grant execute on function public.circle_four_move(uuid, integer) to authenticated;
grant execute on function public.circle_four_close(uuid) to authenticated;
