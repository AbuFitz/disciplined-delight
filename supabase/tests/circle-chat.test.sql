-- Apply 0005_profiles.sql, 0006_circle.sql and 0007_circle_chat.sql first in a disposable database.
\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text);
create temp table ids(name text primary key, id uuid);
grant all on results, ids to authenticated, anon;
create or replace function pg_temp.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.try(text) to authenticated, anon;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.create_profile('alpha_chat', 'Alpha', 'Europe/London');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.create_profile('beta_chat', 'Beta', 'Europe/London');
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.create_profile('gamma_chat', 'Gamma', 'Europe/London');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_send_request('22222222-2222-2222-2222-222222222222');
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.circle_respond_request('11111111-1111-1111-1111-111111111111', true);

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into ids values ('first', public.circle_chat_send('22222222-2222-2222-2222-222222222222', 'Training tomorrow at six?'));
insert into results select 'sender thread shows own latest message',
  count(*) = 1 and bool_and(last_mine) and min(last_message) = 'Training tomorrow at six?',
  string_agg(last_message, ',') from public.circle_chat_threads();

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'recipient thread shows one unread',
  count(*) = 1 and min(unread_count) = 1, min(unread_count)::text from public.circle_chat_threads();
insert into results select 'recipient can read the conversation',
  count(*) = 1 and not bool_and(mine), count(*)::text
  from public.circle_chat_messages('11111111-1111-1111-1111-111111111111');
insert into results select 'RLS lets a participant read the accepted thread',
  count(*) = 1, count(*)::text from public.circle_messages;
insert into results select 'mark read changes exactly one message',
  public.circle_chat_mark_read('11111111-1111-1111-1111-111111111111') = 1, 'one';
insert into ids values ('reply', public.circle_chat_send('11111111-1111-1111-1111-111111111111', 'Yes — easy first set.'));

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into results select 'unconnected person cannot read a guessed thread',
  pg_temp.try($$select * from public.circle_chat_messages('11111111-1111-1111-1111-111111111111')$$) = 'chat_unavailable', 'blocked';
insert into results select 'unconnected person cannot send',
  pg_temp.try($$select public.circle_chat_send('11111111-1111-1111-1111-111111111111','hello')$$) = 'chat_unavailable', 'blocked';
insert into results select 'RLS hides every message from an unconnected person',
  count(*) = 0, count(*)::text from public.circle_messages;

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into results select 'reply creates one unread for A',
  min(unread_count) = 1, min(unread_count)::text from public.circle_chat_threads();
select public.circle_chat_delete((select id from ids where name='first'));

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'deleted message leaves an honest tombstone',
  count(*) filter (where deleted and body = 'Message removed') = 1, string_agg(body, ' | ')
  from public.circle_chat_messages('11111111-1111-1111-1111-111111111111');

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.circle_block('22222222-2222-2222-2222-222222222222');
insert into results select 'blocking closes chat immediately',
  pg_temp.try($$select * from public.circle_chat_messages('22222222-2222-2222-2222-222222222222')$$) = 'chat_unavailable', 'closed';
insert into results select 'RLS hides the thread after blocking',
  count(*) = 0, count(*)::text from public.circle_messages;
insert into results select 'direct message insert blocked',
  pg_temp.try($$insert into public.circle_messages(sender_id,recipient_id,body) values (auth.uid(),'22222222-2222-2222-2222-222222222222','bypass')$$) like 'permission denied%', 'blocked';

reset role;
set role anon;
insert into results select 'anonymous thread list denied',
  pg_temp.try($$select * from public.circle_chat_threads()$$) like 'permission denied%', 'denied';
insert into results select 'anonymous send denied',
  pg_temp.try($$select public.circle_chat_send('11111111-1111-1111-1111-111111111111','hello')$$) like 'permission denied%', 'denied';
reset role;

select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by name;
