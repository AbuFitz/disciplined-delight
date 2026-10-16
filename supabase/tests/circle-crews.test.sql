-- Apply migrations through 0010_circle_crews.sql first in a disposable database.
\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text);
create temp table ids(name text primary key, id uuid);
grant all on results, ids to authenticated, anon;
create or replace function pg_temp.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.try(text) to authenticated, anon;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_profile('alpha_crew', 'Alpha', 'Europe/London');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.create_profile('beta_crew', 'Beta', 'Europe/London');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.create_profile('gamma_crew', 'Gamma', 'Europe/London');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_send_request('22222222-2222-2222-2222-222222222222');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.circle_respond_request('11111111-1111-1111-1111-111111111111', true);

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ids values ('crew', public.circle_crew_create(
  'Saturday Standard', 'Show up for one deliberate session before the weekend disappears.',
  array['22222222-2222-2222-2222-222222222222']::uuid[]
));
insert into results select 'owner sees one active and one pending member',
  count(*) = 1 and min(active_count) = 1 and min(pending_count) = 1
    and bool_and(my_role = 'owner'), count(*)::text from public.circle_crews();
insert into results select 'unconnected people cannot be invited',
  pg_temp.try(format('select public.circle_crew_invite(%L, %L)',
    (select id from ids where name='crew'), '33333333-3333-3333-3333-333333333333'))
    = 'connection_unavailable', 'rejected';

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'invitee sees an explicit pending crew invitation',
  count(*) = 1 and bool_and(my_status = 'pending') and bool_and(owner_username = 'alpha_crew'),
  count(*)::text from public.circle_crews();
select public.circle_crew_respond((select id from ids where name='crew'), true);
insert into ids values ('beta_checkin', public.circle_crew_checkin(
  (select id from ids where name='crew'), 'adjusted', 'Moved the session and kept the promise'
));
insert into results select 'ordinary members cannot govern the roster',
  pg_temp.try(format('select public.circle_crew_remove_member(%L, %L)',
    (select id from ids where name='crew'), '11111111-1111-1111-1111-111111111111'))
    = 'crew_owner_required', 'denied';

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ids values ('alpha_checkin', public.circle_crew_checkin(
  (select id from ids where name='crew'), 'showed_up', 'Saturday session done'
));
insert into results select 'accepted crew has two visible active members',
  count(*) = 2 and count(*) filter (where status = 'active') = 2,
  count(*)::text from public.circle_crew_members((select id from ids where name='crew'));
insert into results select 'crew sees two manual weekly roll calls',
  count(*) = 2 and count(*) filter (where mine) = 1, count(*)::text
  from public.circle_crew_checkins((select id from ids where name='crew'));
select public.circle_crew_checkin(
  (select id from ids where name='crew'), 'rested', 'Recovery was the deliberate choice'
);
insert into results select 'a corrected roll call replaces rather than duplicates',
  count(*) = 2 and count(*) filter (where mine and state = 'rested') = 1, count(*)::text
  from public.circle_crew_checkins((select id from ids where name='crew'));

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into results select 'uninvited person sees no crews', count(*) = 0, count(*)::text
  from public.circle_crews();
insert into results select 'RLS hides direct crew reads', count(*) = 0, count(*)::text
  from public.circle_crews;
insert into results select 'direct crew writes are denied',
  pg_temp.try($$insert into public.circle_crews(owner_id, name, purpose)
    values (auth.uid(), 'Bypass', 'This direct write must never succeed')$$)
    like 'permission denied%', 'denied';

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_remove_connection('22222222-2222-2222-2222-222222222222');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'removing the owner connection removes crew access',
  count(*) = 0, count(*)::text from public.circle_crews();
insert into results select 'removed member cannot add another roll call',
  pg_temp.try(format('select public.circle_crew_checkin(%L, %L, null)',
    (select id from ids where name='crew'), 'showed_up')) = 'crew_unavailable', 'denied';

reset role;
set role anon;
insert into results select 'anonymous crew list is denied',
  pg_temp.try($$select * from public.circle_crews()$$) like 'permission denied%', 'denied';
reset role;

select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by name;
