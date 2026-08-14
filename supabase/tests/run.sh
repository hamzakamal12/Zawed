#!/usr/bin/env bash
#
# Apply every migration to an EMPTY database, then run the assertion suites.
#
# Both halves matter. Applying the migrations in order to a clean database is
# itself the test that they still apply in order to a clean database — the
# thing that breaks silently when someone edits an old migration instead of
# adding a new one.
#
# Usage:  supabase/tests/run.sh
#         PGHOST=... PGUSER=... supabase/tests/run.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
TEMPLATE="${TEMPLATE_DB:-zawed_template}"

export PGHOST="${PGHOST:-localhost}"
export PGUSER="${PGUSER:-postgres}"
export PGPORT="${PGPORT:-5432}"

# ON_ERROR_STOP is what turns a failed assertion into a non-zero exit. Without
# it psql prints the error and carries on, and CI goes green on a broken build.
run() { psql -X -v ON_ERROR_STOP=1 --no-psqlrc -q -d "$1" "${@:2}"; }

echo "── building the template database ───────────────────────────"
dropdb --if-exists "$TEMPLATE"
createdb "$TEMPLATE"
# Migrations are idempotent (`drop ... if exists`), so they emit a wall of
# "does not exist, skipping" notices that buries a real problem. Warnings and
# errors still come through.
export PGOPTIONS='-c client_min_messages=warning'
run "$TEMPLATE" -f "$HERE/00_bootstrap.sql"
for f in "$MIGRATIONS"/*.sql; do
  echo "   $(basename "$f")"
  run "$TEMPLATE" -f "$f"
done
unset PGOPTIONS
run "$TEMPLATE" -f "$HERE/01_helpers.sql"
echo "   ✅ all migrations applied to an empty database"
echo

failed=0
shopt -s nullglob
for f in "$HERE"/[0-9][0-9]_*.sql; do
  name="$(basename "$f" .sql)"
  case "$name" in 00_bootstrap|01_helpers) continue ;; esac

  # A fresh copy per suite. Sharing one database would let a suite pass because
  # an earlier suite happened to leave the right row behind — the exact way a
  # stateful test suite lies.
  db="zawed_test_${name}"
  dropdb --if-exists "$db"
  createdb --template "$TEMPLATE" "$db"

  echo "── ${name} ──────────────────────────────────────────────────"
  if run "$db" -f "$f"; then
    echo "   PASS"
  else
    echo "   FAIL"
    failed=1
  fi
  dropdb --if-exists "$db"
  echo
done

if [ "$failed" -eq 0 ]; then echo "✅ all suites passed"; else echo "❌ suites failed"; fi
exit "$failed"
