#!/usr/bin/env bash
#
# Reset the public demo database.
#
# The demo pm2 app (expense-tracker-demo) runs with SEED_SAMPLE=1, so
# when its database file is missing the app recreates it with the
# sample data from database/seed.sql on the next start. This script
# stops the app, deletes the demo database, and starts it again.
#
# Cron example (03:30 every night, after the backup at 03:00):
#   30 3 * * * /var/www/expense-tracker/deploy/reset-demo-db.sh \
#              >> /var/log/expense-demo.log 2>&1

set -euo pipefail

DEMO_DB_PATH="${DEMO_DB_PATH:-/var/lib/expense-tracker/demo.db}"
DEMO_APP_NAME="${DEMO_APP_NAME:-expense-tracker-demo}"
APP_DIR="${APP_DIR:-/var/www/expense-tracker}"

echo "Resetting demo database: $DEMO_DB_PATH"

pm2 stop "$DEMO_APP_NAME" >/dev/null 2>&1 || true

rm -f "$DEMO_DB_PATH" "$DEMO_DB_PATH-wal" "$DEMO_DB_PATH-shm"

pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" \
  --only "$DEMO_APP_NAME" \
  --env production

echo "Demo database reset; $DEMO_APP_NAME restarted with sample data"
