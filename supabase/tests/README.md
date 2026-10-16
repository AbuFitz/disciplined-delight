# Database tests

**Run them all:** `supabase/tests/run-local.sh` starts a throwaway Postgres 16, applies the simulated auth stand-in
and migrations every migration, runs every `*.test.sql` and prints pass/fail counts. Needs root and the Postgres 16
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

`profiles.test.sql`, `reminders.test.sql` and `circle.test.sql` cover their matching later migrations. Circle's checks
prove explicit sharing, connection-only feeds, request direction, kudos visibility, block/unblock behaviour, blocked
direct writes and anonymous denial. Run them against a disposable database after applying migrations through
`0007_circle_chat.sql`; they create profiles for the three fixed test users from `auth-env.sql`.

`circle-chat.test.sql` targets `0007_circle_chat.sql` in a fresh disposable database. It covers accepted-connection
gating, unread/read state, bidirectional messages, tombstones, guessed-thread denial, block shutdown, direct-write
denial and anonymous denial. Chat is RLS-private but intentionally documented as not end-to-end encrypted.

`circle-challenges.test.sql` targets `0008_circle_challenges.sql`. It covers explicit invitations, acceptance,
self-reported progress totals, participant-only check-ins, target bounds, correction ownership, guessed-ID denial,
RLS reads, direct-write denial, connection removal through blocking and anonymous denial.

`circle-four.test.sql` targets `0009_circle_four.sql`. It covers self-authored stakes, explicit acceptance,
turn enforcement, a server-detected win, one-open-game concurrency protection, participant-only visibility,
RLS reads, direct-write denial, block shutdown and anonymous denial.
