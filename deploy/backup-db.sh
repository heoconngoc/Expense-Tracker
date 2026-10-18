#!/usr/bin/env bash
#
# Nightly SQLite backup for the expense tracker.
# Uses SQLite's online ".backup" so a running server is safe to copy,
# then gzips and prunes old files.
#
# Cron example (run as root at 03:00 every day):
#   0 3 * * * DB_PATH=/var/lib/expense-tracker/expense.db \
#             BACKUP_DIR=/var/lib/expense-tracker/backups \
#             /var/www/expense-tracker/deploy/backup-db.sh \
#             >> /var/log/expense-backup.log 2>&1

set -euo pipefail

DB_PATH="${DB_PATH:-/var/lib/expense-tracker/expense.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/expense-tracker/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found: $DB_PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y-%m-%d-%H%M%S)"
DEST="$BACKUP_DIR/expense-$STAMP.db"

sqlite3 "$DB_PATH" ".backup '$DEST'"
gzip -f "$DEST"

find "$BACKUP_DIR" -name 'expense-*.db.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written: $DEST.gz"
