# Sync schema tests

`sync_rls.test.sql` exercises `0003_sync.sql` against a real Postgres: idempotent retries, optimistic-concurrency
conflicts, tombstones, blocked direct writes, per-user isolation and anon denial.

It needs a minimal stand-in for Supabase's `auth` schema (roles `anon`/`authenticated`, `auth.users`, `auth.uid()` reading
`request.jwt.claim.sub`). Setup used when this was verified (Postgres 16):

```sql
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated;
insert into auth.users(id) values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
```

Then apply `0001`–`0003` and run `psql -f sync_rls.test.sql`. Every row should read `PASS`.
This checks policy and function logic. It is not a substitute for testing against your real Supabase project
(Supabase's own auth service issues the JWTs in production).

`profiles.test.sql`, `reminders.test.sql` and `circle.test.sql` cover their matching later migrations. Circle's checks
prove explicit sharing, connection-only feeds, request direction, kudos visibility, block/unblock behaviour, blocked
direct writes and anonymous denial. Run them against a disposable database after applying migrations through
`0006_circle.sql`; they create profiles for the three fixed test users from `auth-env.sql`.
