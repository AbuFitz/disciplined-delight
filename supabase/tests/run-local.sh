#!/usr/bin/env bash
# Runs every SQL test against a throwaway local Postgres 16 with a SIMULATED Supabase auth schema.
# This checks policy and function logic. It does NOT prove anything about your real Supabase project: see
# docs/SUPABASE-SETUP.md for the checks that must be run there. Needs root (to switch to the postgres user) and
# Postgres 16 binaries (/usr/lib/postgresql/16/bin).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN=/usr/lib/postgresql/16/bin
DIR=/tmp/vayvor-pgtest
PORT=54399
as_pg() { su postgres -s /bin/bash -c "$*"; }
cleanup() { as_pg "$BIN/pg_ctl -D $DIR/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
cleanup
mkdir -p "$DIR" && chown postgres "$DIR"
as_pg "$BIN/initdb -D $DIR/data -A trust -U postgres" >/dev/null
as_pg "$BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR' -l $DIR/log -w start" >/dev/null
q() { psql -h "$DIR" -p $PORT -U postgres -d "${DB:-postgres}" -v ON_ERROR_STOP=1 -q -X "$@"; }
fail=0
run_test() {
  local name="$1" file="$2"
  DB=postgres q -c "drop database if exists t" -c "drop role if exists anon" -c "drop role if exists authenticated" -c "drop role if exists service_role" -c "create database t" >/dev/null 2>&1
  DB=t q -f "$ROOT/supabase/tests/auth-env.sql" >/dev/null
  for mf in "$ROOT"/supabase/migrations/*.sql; do
    m=$(basename "$mf" .sql)
    DB=t q -f "$mf" >/dev/null 2>"$DIR/mig.err" || { echo "MIGRATION $m FAILED: $(head -3 "$DIR/mig.err")"; fail=1; }
  done
  local out
  out=$(psql -h "$DIR" -p $PORT -U postgres -d t -X -q -t -A -F '|' -f "$ROOT/supabase/tests/$file" 2>&1 || true)
  echo "== $name: $(printf '%s\n' "$out" | grep -ci pass) pass-lines, $(printf '%s\n' "$out" | grep -ci fail) fail-lines"
  printf '%s\n' "$out" | grep -i 'fail' | head -5 || true
  if printf '%s\n' "$out" | grep -qi 'fail'; then fail=1; fi
}
for tf in "$ROOT"/supabase/tests/*.test.sql; do run_test "$(basename "$tf" .test.sql)" "$(basename "$tf")"; done
exit $fail
