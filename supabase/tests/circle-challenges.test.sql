-- Apply 0005_profiles.sql through 0008_circle_challenges.sql first in a disposable database.
\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text);
create temp table ids(name text primary key, id uuid);
grant all on results, ids to authenticated, anon;
create or replace function pg_temp.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.try(text) to authenticated, anon;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_profile('alpha_pact', 'Alpha', 'Europe/London');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.create_profile('beta_pact', 'Beta', 'Europe/London');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.create_profile('gamma_pact', 'Gamma', 'Europe/London');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_send_request('22222222-2222-2222-2222-222222222222');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.circle_respond_request('11111111-1111-1111-1111-111111111111', true);

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ids values ('pact', public.circle_challenge_create(
  '22222222-2222-2222-2222-222222222222', 'Eight-session pact', 'sessions', 8, current_date + 14
));
insert into results select 'creator sees pending invitation',
  count(*) = 1 and bool_and(status = 'pending') and not bool_and(invited_me), count(*)::text
  from public.circle_challenges();

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'invitee sees explicit invitation',
  count(*) = 1 and bool_and(invited_me), count(*)::text from public.circle_challenges();
select public.circle_challenge_respond((select id from ids where name='pact'), true);
insert into ids values ('beta_entry', public.circle_challenge_add(
  (select id from ids where name='pact'), 2, 'Two sessions logged honestly'
));

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ids values ('alpha_entry', public.circle_challenge_add(
  (select id from ids where name='pact'), 1, 'First session'
));
insert into results select 'both progress totals are visible to a participant',
  min(mine_progress) = 1 and min(their_progress) = 2, min(mine_progress::text || ':' || their_progress::text)
  from public.circle_challenges();
insert into results select 'participant sees both check-ins',
  count(*) = 2 and count(*) filter (where mine) = 1, count(*)::text
  from public.circle_challenge_entries((select id from ids where name='pact'));
insert into results select 'target cannot be exceeded',
  pg_temp.try(format('select public.circle_challenge_add(%L, 10, null)', (select id from ids where name='pact'))) = 'progress_exceeds_target', 'rejected';

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into results select 'unconnected person sees no pacts', count(*) = 0, count(*)::text
  from public.circle_challenges();
insert into results select 'guessed pact entries are denied',
  pg_temp.try(format('select * from public.circle_challenge_entries(%L)', (select id from ids where name='pact'))) = 'challenge_unavailable', 'denied';
insert into results select 'RLS hides direct challenge reads', count(*) = 0, count(*)::text
  from public.circle_challenges;
insert into results select 'direct writes are denied',
  pg_temp.try($$insert into public.circle_challenges(creator_id,invited_id,title,unit,target,ends_on)
    values (auth.uid(),'11111111-1111-1111-1111-111111111111','Bypass','sets',5,current_date+7)$$) like 'permission denied%', 'denied';

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_block('22222222-2222-2222-2222-222222222222');
insert into results select 'blocking removes pact visibility immediately', count(*) = 0, count(*)::text
  from public.circle_challenges();
insert into results select 'blocking prevents new progress',
  pg_temp.try(format('select public.circle_challenge_add(%L, 1, null)', (select id from ids where name='pact'))) = 'challenge_unavailable', 'closed';

reset role;
set role anon;
insert into results select 'anonymous list is denied',
  pg_temp.try($$select * from public.circle_challenges()$$) like 'permission denied%', 'denied';
reset role;

select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by name;
