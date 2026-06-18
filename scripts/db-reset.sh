#!/usr/bin/env bash
# db-reset.sh — Generate a full DB reset SQL (teardown + all migrations + seed)
#
# Usage:
#   ./scripts/db-reset.sh                    → writes to /tmp/souffleur-reset.sql and copies to clipboard
#   ./scripts/db-reset.sh | psql "$DB_URL"   → run directly if you have psql + a DB URL
#
# To get your DB URL: Supabase dashboard → Project Settings → Database → Connection string (URI mode)
# It looks like: postgresql://postgres:[password]@db.xzicupjcemsmxcctaart.supabase.co:5432/postgres

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/web/supabase/migrations"
SEED_FILE="$REPO_ROOT/web/supabase/seed.sql"
OUT="/tmp/souffleur-reset.sql"

# ─── Build the SQL ────────────────────────────────────────────────────────────
{
echo "-- ============================================================"
echo "-- souffleur.ai — full DB reset"
echo "-- Generated: $(date)"
echo "-- ============================================================"
echo ""

cat << 'TEARDOWN'
-- ─── TEARDOWN ────────────────────────────────────────────────────────────────
-- Drop all policies
drop policy if exists "user owns their notes"                      on user_line_notes;
drop policy if exists "users read own plays"                       on user_plays;
drop policy if exists "users insert own plays"                     on user_plays;
drop policy if exists "users update own plays"                     on user_plays;
drop policy if exists "users delete own plays"                     on user_plays;
drop policy if exists "users can read editor flags for shared plays" on user_plays;
drop policy if exists "editors can update collaborator permissions" on user_plays;
drop policy if exists "authenticated read plays"                   on plays;
drop policy if exists "owners can delete plays"                    on plays;
drop policy if exists "owners can update play title"               on plays;
drop policy if exists "editors can update plays"                   on plays;
drop policy if exists "authenticated read scenes"                  on scenes;
drop policy if exists "owners can write scenes"                    on scenes;

-- Drop triggers, functions
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user()                   cascade;
drop function if exists public.get_play_cast(uuid)                 cascade;
drop function if exists public.user_can_edit_play(uuid, uuid)      cascade;
drop function if exists public.plays_set_creator()                 cascade;

-- Drop tables (cascade removes FKs/indexes automatically)
drop table if exists user_line_notes cascade;
drop table if exists user_plays       cascade;
drop table if exists scenes           cascade;
drop table if exists plays            cascade;

TEARDOWN

# ─── Migrations in order ─────────────────────────────────────────────────────
echo ""
echo "-- ─── MIGRATIONS ────────────────────────────────────────────────────────────"
for f in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  echo ""
  echo "-- === $(basename "$f") ==="
  cat "$f"
  echo ""
done

# ─── Seed ────────────────────────────────────────────────────────────────────
echo ""
echo "-- ─── SEED ──────────────────────────────────────────────────────────────────"
echo ""
cat "$SEED_FILE"

# ─── Re-assign sample plays to existing users ─────────────────────────────────
# (the handle_new_user trigger only fires for new signups, not existing accounts)
cat << 'BACKFILL'

-- ─── BACKFILL: add sample plays for all existing users ───────────────────────
insert into user_plays (user_id, play_id, state)
select u.id, p.id, 'ready'
from auth.users u
cross join plays p
where p.is_sample = true
on conflict (user_id, play_id) do nothing;

BACKFILL

} > "$OUT"

echo "✓ Reset SQL written to: $OUT"
echo ""
echo "How to apply:"
echo "  1. Open https://supabase.com/dashboard/project/xzicupjcemsmxcctaart/sql/new"
echo "  2. Paste the contents of $OUT"
echo "  3. Click Run"
echo ""
echo "  — OR — if you have psql and your DB URL:"
echo "  DB_URL='postgresql://postgres:[password]@db.xzicupjcemsmxcctaart.supabase.co:5432/postgres'"
echo "  psql \"\$DB_URL\" < $OUT"
echo ""

# Copy to clipboard on macOS
if command -v pbcopy &>/dev/null; then
  pbcopy < "$OUT"
  echo "✓ Also copied to clipboard (macOS)"
fi
