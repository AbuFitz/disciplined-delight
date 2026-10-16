# Database tests

**Run them all:** `supabase/tests/run-local.sh` starts a throwaway Postgres 16, applies the simulated auth stand-in
and migrations `0001`–`0005`, runs every `*.test.sql` and prints pass/fail counts. Needs root and the Postgres 16
binaries. It tests SQL logic against a **simulated** Supabase auth schema, not a real project: see
`docs/SUPABASE-SETUP.md` for what has to be verified on the real one.

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
