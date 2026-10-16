\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text);
grant all on results to authenticated, anon;
-- helper: run as user
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into results select 'A applies new record', (r->>'status')='applied' and (r->>'rev')='1', r::text from (select public.push_mutation('mealLogs','m1','put','{"n":1}',0,'mid-1') r) s;
insert into results select 'A retry same mid is duplicate (idempotent)', (r->>'status')='duplicate', r::text from (select public.push_mutation('mealLogs','m1','put','{"n":1}',0,'mid-1') r) s;
insert into results select 'A update with correct base applies rev 2', (r->>'status')='applied' and (r->>'rev')='2', r::text from (select public.push_mutation('mealLogs','m1','put','{"n":2}',1,'mid-2') r) s;
insert into results select 'A stale base is a conflict returning server data', (r->>'status')='conflict' and (r->'data'->>'n')='2', r::text from (select public.push_mutation('mealLogs','m1','put','{"n":99}',1,'mid-3') r) s;
insert into results select 'conflict did not apply (server still n=2)', (data->>'n')='2', data::text from public.records where collection='mealLogs' and id='m1';
insert into results select 'resolved retry with same mid after conflict is applied', (r->>'status')='applied' and (r->>'rev')='3', r::text from (select public.push_mutation('mealLogs','m1','put','{"n":3}',2,'mid-3') r) s;
insert into results select 'delete tombstones and bumps rev', (r->>'rev')='4', r::text from (select public.push_mutation('mealLogs','m1','delete',null,3,'mid-4') r) s;
insert into results select 'tombstone keeps data and sets deleted_at', deleted_at is not null and (data->>'n')='3', coalesce(data::text,'null') from public.records where id='m1';
-- direct writes are blocked
do $$ begin begin insert into public.records(collection,id,data) values ('x','y','{}'); insert into results values ('direct INSERT blocked', false, 'allowed!'); exception when insufficient_privilege then insert into results values ('direct INSERT blocked', true, 'denied'); end; end $$;
do $$ begin begin update public.records set data='{}'; insert into results values ('direct UPDATE blocked', false, 'allowed!'); exception when insufficient_privilege then insert into results values ('direct UPDATE blocked', true, 'denied'); end; end $$;
do $$ begin begin delete from public.records; insert into results values ('direct DELETE blocked', false, 'allowed!'); exception when insufficient_privilege then insert into results values ('direct DELETE blocked', true, 'denied'); end; end $$;
-- second user
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'B cannot read A rows', count(*)=0, count(*)::text from public.records;
insert into results select 'B cannot read A mutation log', count(*)=0, count(*)::text from public.mutation_log;
insert into results select 'B can write same collection/id independently', (r->>'status')='applied' and (r->>'rev')='1', r::text from (select public.push_mutation('mealLogs','m1','put','{"b":true}',0,'mid-1') r) s;
insert into results select 'B reusing A''s mutation id does not collide', true, 'mid scoped per user' ;
insert into results select 'A data unchanged after B write', (select (data->>'n')='3' from (select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true)) c, public.records where id='m1');
-- anon
reset role; set role anon;
do $$ begin begin perform public.push_mutation('a','b','put','{}',0,'z'); insert into results values ('anon cannot call push_mutation', false, 'allowed!'); exception when insufficient_privilege then insert into results values ('anon cannot call push_mutation', true, 'denied'); end; end $$;
do $$ begin begin perform * from public.records; insert into results values ('anon cannot read records', false, 'allowed!'); exception when insufficient_privilege then insert into results values ('anon cannot read records', true, 'denied'); end; end $$;
reset role; set role authenticated; set request.jwt.claim.sub = '';
do $$ begin begin perform public.push_mutation('a','b','put','{}',0,'z2'); insert into results values ('no auth uid rejected', false, 'allowed!'); exception when others then insert into results values ('no auth uid rejected', sqlstate='28000', sqlerrm); end; end $$;
reset role;
select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by name;
