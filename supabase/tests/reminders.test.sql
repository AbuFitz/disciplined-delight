\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text); grant all on results to authenticated, anon, service_role;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.save_push_subscription('https://push.example/a','pk','au','ua',null);
select public.replace_reminders(jsonb_build_array(
  jsonb_build_object('key','prayer:d1:asr','kind','prayer','fire_at', now() + interval '1 hour','title','Asr soon','body','b','url','/salah'),
  jsonb_build_object('key','prayer:d1:isha','kind','prayer','fire_at', now() + interval '5 hours','title','Isha soon','body','b','url','/salah')));
insert into results select 'two reminders scheduled', count(*)=2, count(*)::text from public.scheduled_reminders;
-- re-upload with one changed and one removed: idempotent, no duplicates
select public.replace_reminders(jsonb_build_array(jsonb_build_object('key','prayer:d1:asr','kind','prayer','fire_at', now() + interval '2 hours','title','Asr soon','body','b','url','/salah')));
insert into results select 'replace removes dropped keys, no duplicates', count(*)=1, count(*)::text from public.scheduled_reminders;
do $$ begin begin perform public.replace_reminders(jsonb_build_array(jsonb_build_object('key','x','kind','prayer','fire_at',now(),'title','t','body','b','url','https://evil.example'))); insert into results values ('external url rejected', false, 'allowed'); exception when check_violation then insert into results values ('external url rejected', true, 'denied'); end; end $$;
do $$ begin begin perform * from public.claim_due_reminders(); insert into results values ('user cannot claim reminders', false, 'allowed'); exception when insufficient_privilege then insert into results values ('user cannot claim reminders', true, 'denied'); end; end $$;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'B cannot see A reminders or subscriptions', (select count(*) from public.scheduled_reminders)=0 and (select count(*) from public.push_subscriptions)=0, 'rls';
reset role;
-- server side: make one due, one stale, one future
update public.scheduled_reminders set fire_at = now() - interval '1 minute' where key='prayer:d1:asr';
insert into public.scheduled_reminders(user_id,key,kind,fire_at,title,body,url) values ('11111111-1111-1111-1111-111111111111','old','food', now() - interval '3 hours','t','b','/'),('11111111-1111-1111-1111-111111111111','later','food', now() + interval '3 hours','t','b','/');
set role service_role;
insert into results select 'claim returns only the due reminder', count(*)=1 and min(key)='prayer:d1:asr', string_agg(key, ',') from public.claim_due_reminders();
insert into results select 'claiming again returns nothing (sent exactly once)', count(*)=0, count(*)::text from public.claim_due_reminders();
reset role;
insert into results select 'stale reminder skipped, future untouched', (select skipped_at is not null from public.scheduled_reminders where key='old') and (select sent_at is null and skipped_at is null from public.scheduled_reminders where key='later'), 'ok';
select case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by name;
