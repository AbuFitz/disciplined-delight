-- Apply migrations through 0009_circle_four.sql first in a disposable database.
\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text);
create temp table ids(name text primary key, id uuid);
grant all on results, ids to authenticated, anon;
create or replace function pg_temp.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.try(text) to authenticated, anon;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_profile('alpha_four', 'Alpha', 'Europe/London');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.create_profile('beta_four', 'Beta', 'Europe/London');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.create_profile('gamma_four', 'Gamma', 'Europe/London');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_send_request('22222222-2222-2222-2222-222222222222');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.circle_respond_request('11111111-1111-1111-1111-111111111111', true);

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ids values ('game', public.circle_four_create(
  '22222222-2222-2222-2222-222222222222', 'I will take a brisk twenty-minute walk'
));
insert into results select 'creator sees a pending invitation and their own token',
  count(*) = 1 and bool_and(status = 'pending') and min(mine_token) = 1
    and not bool_and(invited_me), count(*)::text from public.circle_four_games();
insert into results select 'one open game per pair is enforced',
  pg_temp.try($$select public.circle_four_create(
    '22222222-2222-2222-2222-222222222222', 'I will prepare tomorrow lunch tonight'
  )$$) = 'game_open', 'rejected';

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'invitee must author their own dare to accept',
  pg_temp.try(format('select public.circle_four_respond(%L, true, null)',
    (select id from ids where name='game'))) = 'invalid_dare', 'rejected';
select public.circle_four_respond(
  (select id from ids where name='game'), true, 'I will do ten careful minutes of mobility'
);
insert into results select 'invitee sees both self-authored stakes and waits for creator',
  count(*) = 1 and bool_and(status = 'active') and min(mine_token) = 2
    and not bool_and(my_turn) and bool_and(invited_dare like 'I will do ten%'), count(*)::text
  from public.circle_four_games();
insert into results select 'out-of-turn move is rejected',
  pg_temp.try(format('select public.circle_four_move(%L, 3)',
    (select id from ids where name='game'))) = 'not_your_turn', 'rejected';

-- Alpha builds a bottom-row win in columns 0..3; Beta stacks harmlessly in columns 6, 6 and 5.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_four_move((select id from ids where name='game'), 0);
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.circle_four_move((select id from ids where name='game'), 6);
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_four_move((select id from ids where name='game'), 1);
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.circle_four_move((select id from ids where name='game'), 6);
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_four_move((select id from ids where name='game'), 2);
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.circle_four_move((select id from ids where name='game'), 5);
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_four_move((select id from ids where name='game'), 3);
insert into results select 'server detects a four-token win and stops turns',
  count(*) = 1 and bool_and(status = 'won')
    and bool_and(winner_id = '11111111-1111-1111-1111-111111111111')
    and bool_and(current_turn_id is null), count(*)::text from public.circle_four_games();
insert into results select 'finished game rejects another move',
  pg_temp.try(format('select public.circle_four_move(%L, 4)',
    (select id from ids where name='game'))) = 'game_unavailable', 'rejected';

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into results select 'unconnected person sees no games', count(*) = 0, count(*)::text
  from public.circle_four_games();
insert into results select 'RLS hides direct game reads', count(*) = 0, count(*)::text
  from public.circle_four_games;
insert into results select 'direct game writes are denied',
  pg_temp.try($$insert into public.circle_four_games(creator_id, invited_id, creator_dare)
    values (auth.uid(), '11111111-1111-1111-1111-111111111111', 'Bypass the RPC')$$)
    like 'permission denied%', 'denied';

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_block('22222222-2222-2222-2222-222222222222');
insert into results select 'blocking removes game visibility immediately', count(*) = 0, count(*)::text
  from public.circle_four_games();

reset role;
set role anon;
insert into results select 'anonymous game list is denied',
  pg_temp.try($$select * from public.circle_four_games()$$) like 'permission denied%', 'denied';
reset role;

select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by name;
