-- Run against an empty public.profiles (the test creates profiles for two users).
\set ON_ERROR_STOP off
create temp table results(name text, ok boolean, detail text); grant all on results to authenticated, anon;
create or replace function pg_temp.try(sql text) returns text language plpgsql as $$ begin execute sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.try(text) to authenticated, anon;
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into results select 'A creates a profile', (r->>'username')='Sam_Lifts', r::text from (select public.create_profile('Sam_Lifts','Sam','Europe/London') r) s;
insert into results select 'second profile for same user refused', pg_temp.try($$select public.create_profile('Other_One','x','Europe/London')$$) = 'profile_exists', 'profile_exists';
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into results select 'B cannot take A''s handle in a different case', pg_temp.try($$select public.create_profile('sam_LIFTS','Impostor','Europe/London')$$) = 'username_taken', 'case-insensitive';
insert into results select 'availability reports taken case-insensitively', public.username_available('SAM_lifts') = false, 'taken';
insert into results select 'availability true for a free handle', public.username_available('free_name'), 'free';
insert into results select 'reserved handle refused', pg_temp.try($$select public.create_profile('Admin','x','Europe/London')$$) = 'username_reserved', 'reserved';
insert into results select 'bad syntax refused (digit first)', pg_temp.try($$select public.create_profile('1abc','x','Europe/London')$$) = 'invalid_username', 'syntax';
insert into results select 'bad syntax refused (too short)', pg_temp.try($$select public.create_profile('ab','x','Europe/London')$$) = 'invalid_username', 'syntax';
insert into results select 'bad syntax refused (symbols)', pg_temp.try($$select public.create_profile('a b!','x','Europe/London')$$) = 'invalid_username', 'syntax';
insert into results select 'B creates profile with free handle', (public.create_profile('free_name','Bea','Europe/London')->>'username') = 'free_name', 'ok';
insert into results select 'B cannot read A''s profile row', (select count(*) from public.profiles where user_id <> auth.uid()) = 0, 'rls';
insert into results select 'B cannot rename onto A''s handle', pg_temp.try($$select public.update_profile(null,null,null,'SAM_LIFTS')$$) = 'username_taken', 'taken';
insert into results select 'B can change own handle', (public.update_profile(null,null,null,'bea_new')->>'username') = 'bea_new', 'rename';
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into results select 'A can now claim the vacated handle', public.username_available('free_name'), 'released';
insert into results select 'direct INSERT blocked', pg_temp.try($$insert into public.profiles(user_id,username,display_name) values (auth.uid(),'direct_x','x')$$) like 'permission denied%', 'blocked';
insert into results select 'direct UPDATE blocked', pg_temp.try($$update public.profiles set username='hax'$$) like 'permission denied%', 'blocked';
reset role; set role anon;
insert into results select 'anon cannot check availability', pg_temp.try($$select public.username_available('zzz')$$) like 'permission denied%', 'denied';
insert into results select 'anon cannot read profiles', pg_temp.try($$select * from public.profiles$$) like 'permission denied%', 'denied';
reset role;
select case when ok then 'PASS' else 'FAIL' end as result, name from results order by name;
