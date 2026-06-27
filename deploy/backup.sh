#!/usr/bin/env bash
# deploy/backup.sh
# Sichert SQLite-Datenbank und Bild-Uploads als .tar.gz.
# Dateien älter als 14 Tage werden automatisch gelöscht.
set -euo pipefail

APP_DIR="/opt/ki-bild-anomalien-spiel"
DATA_DIR="$APP_DIR/data"
BACKUP_DIR="/var/backups/ki-bild-anomalien-spiel"
RETENTION_DAYS=14

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Backup starten..."

# SQLite WAL-Checkpoint erzwingen damit die DB konsistent ist
if [ -f "$DATA_DIR/app.db" ]; then
  sqlite3 "$DATA_DIR/app.db" "PRAGMA wal_checkpoint(FULL);" 2>/dev/null || true
fi

# Archiv erstellen
tar -czf "$BACKUP_FILE" -C "$APP_DIR" data/
echo "[$TIMESTAMP] Backup erstellt: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Alte Backups löschen
DELETED=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime "+$RETENTION_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$TIMESTAMP] $DELETED alte Backup(s) älter als $RETENTION_DAYS Tage gelöscht."
fi

echo "[$TIMESTAMP] Backup abgeschlossen."
