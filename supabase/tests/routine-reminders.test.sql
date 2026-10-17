\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text);
grant all on results to authenticated, anon, service_role;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.replace_reminders(jsonb_build_array(
  jsonb_build_object(
    'key','routine:read:2026-10-16',
    'kind','routine',
    'fire_at',now() + interval '1 hour',
    'title','Read ten pages',
    'body','Phone away. Book open.',
    'url','/'
  )
));
insert into results
select 'routine kind is accepted after 0011',
  count(*) = 1 and min(kind) = 'routine',
  concat(count(*), ' row(s), kind=', min(kind))
from public.scheduled_reminders;

select public.replace_reminders(jsonb_build_array(
  jsonb_build_object(
    'key','routine:read:2026-10-16',
    'kind','routine',
    'fire_at',now() + interval '2 hours',
    'title','Read twelve pages',
    'body','Updated deliberately.',
    'url','/'
  )
));
insert into results
select 'routine reschedule stays idempotent',
  count(*) = 1 and min(title) = 'Read twelve pages',
  concat(count(*), ' row(s), title=', min(title))
from public.scheduled_reminders;

do $$
begin
  begin
    perform public.replace_reminders(jsonb_build_array(jsonb_build_object(
      'key','bad', 'kind','advert', 'fire_at',now() + interval '1 hour',
      'title','Bad', 'body','Bad', 'url','/'
    )));
    insert into results values ('unknown reminder kind is rejected', false, 'allowed');
  exception when check_violation then
    insert into results values ('unknown reminder kind is rejected', true, 'denied');
  end;
end $$;

select case when ok then 'PASS' else 'FAIL' end as result, name, detail
from results order by name;
