#!/usr/bin/env bash
# Sauvegarde PostgreSQL — à lancer par cron sur le serveur OVH (docs/maintenance.md)
# Crontab suggéré : 0 3 * * * /opt/terraproxi/infrastructure/docker/backup.sh >> /var/log/terraproxi-backup.log 2>&1

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/terraproxi}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/terraproxi_$TIMESTAMP.sql.gz"

cd "$APP_DIR"
# POSTGRES_USER / POSTGRES_DB viennent du .env (cron n'hérite d'aucune variable)
set -a; source ./.env; set +a

mkdir -p "$BACKUP_DIR"

# Dump dans le conteneur du service "db" (la base n'est pas exposée à l'extérieur)
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Une sauvegarde vide signale un échec silencieux de pg_dump
if [[ ! -s "$BACKUP_FILE" ]] || [[ $(gzip -dc "$BACKUP_FILE" | head -c 1 | wc -c) -eq 0 ]]; then
  echo "[$(date)] ✗ Sauvegarde vide : $BACKUP_FILE" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi
echo "[$(date)] Backup créé : $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Purge des backups > $RETENTION_DAYS jours terminée."
