-- Apply 0003_sync.sql, 0005_profiles.sql and 0006_circle.sql first.
\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text);
create temp table ids(name text primary key, id uuid);
grant all on results, ids to authenticated, anon;
create or replace function pg_temp.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.try(text) to authenticated, anon;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_profile('alpha_move', 'Alpha', 'Europe/London');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.create_profile('beta_lifts', 'Beta', 'Europe/London');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.create_profile('gamma_runs', 'Gamma', 'Europe/London');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into results select 'handle search finds public identity without email',
  count(*) = 1 and min(username) = 'beta_lifts', string_agg(username, ',')
  from public.circle_find_people('beta');
insert into results select 'A sends request to B',
  public.circle_send_request('22222222-2222-2222-2222-222222222222') = 'outgoing', 'outgoing';
insert into results select 'A sees outgoing request',
  count(*) = 1 and min(relationship) = 'outgoing', string_agg(relationship, ',')
  from public.circle_my_connections();

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'B sees incoming request',
  count(*) = 1 and min(relationship) = 'incoming', string_agg(relationship, ',')
  from public.circle_my_connections();
insert into results select 'B accepts A',
  public.circle_respond_request('11111111-1111-1111-1111-111111111111', true) = 'connected', 'connected';

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ids values ('post', public.circle_share('training', 'First complete week', 'Three sessions, no heroics.', 'Sessions', '3/3', current_date));
insert into results select 'A sees own deliberate share', count(*) = 1, count(*)::text from public.circle_feed();
insert into results select 'A cannot kudos own share',
  pg_temp.try(format('select public.circle_toggle_kudos(%L)', (select id from ids where name='post'))) = 'post_not_found', 'blocked';

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'accepted B sees A share', count(*) = 1, count(*)::text from public.circle_feed();
insert into results select 'B toggles kudos on', public.circle_toggle_kudos((select id from ids where name='post')), 'on';
insert into results select 'B toggles kudos off', not public.circle_toggle_kudos((select id from ids where name='post')), 'off';

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into results select 'unconnected C sees no share', count(*) = 0, count(*)::text from public.circle_feed();
insert into results select 'unconnected C cannot kudos guessed post id',
  pg_temp.try(format('select public.circle_toggle_kudos(%L)', (select id from ids where name='post'))) = 'post_not_found', 'blocked';

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_block('22222222-2222-2222-2222-222222222222');
insert into results select 'block removes connection', count(*) = 0, count(*)::text from public.circle_my_connections();
insert into results select 'block list can be reviewed',
  count(*) = 1 and min(username) = 'beta_lifts', string_agg(username, ',') from public.circle_my_blocks();
insert into results select 'blocked person disappears from search', count(*) = 0, count(*)::text
  from public.circle_find_people('beta');

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'blocked B no longer sees A share', count(*) = 0, count(*)::text from public.circle_feed();

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_unblock('22222222-2222-2222-2222-222222222222');
insert into results select 'unblock restores discovery, not connection',
  (select count(*) from public.circle_find_people('beta')) = 1
  and (select count(*) from public.circle_my_connections()) = 0, 'discoverable only';
insert into results select 'direct post insert blocked',
  pg_temp.try($$insert into public.circle_posts(author_id,kind,title) values (auth.uid(),'training','bypass')$$) like 'permission denied%', 'blocked';
insert into results select 'direct connection insert blocked',
  pg_temp.try($$insert into public.circle_connections(user_low,user_high,requested_by) values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',auth.uid())$$) like 'permission denied%', 'blocked';

reset role;
set role anon;
insert into results select 'anonymous feed denied',
  pg_temp.try($$select * from public.circle_feed()$$) like 'permission denied%', 'denied';
insert into results select 'anonymous people search denied',
  pg_temp.try($$select * from public.circle_find_people('alpha')$$) like 'permission denied%', 'denied';
reset role;

select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by name;
