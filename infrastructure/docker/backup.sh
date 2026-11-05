#!/usr/bin/env bash
# Sauvegarde PostgreSQL + photos envoyées — à lancer par cron sur le serveur OVH (docs/maintenance.md)
# Crontab : 0 3 * * * /opt/terraproxi/infrastructure/docker/backup.sh >> /var/log/terraproxi-backup.log 2>&1
#
# Variables (.env) :
#   BACKUP_REMOTE     destination rclone hors serveur (ex. ovh-s3:terraproxi-backups) ; vide = copie locale seule
#   ALERT_WEBHOOK_URL webhook Slack / Discord / Mattermost prévenu en cas d'échec

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/terraproxi}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="$BACKUP_DIR/terraproxi_$TIMESTAMP.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"

cd "$APP_DIR"
# POSTGRES_USER / POSTGRES_DB / BACKUP_REMOTE / ALERT_WEBHOOK_URL viennent du .env (cron n'hérite d'aucune variable)
set -a; source ./.env; set +a

alert() {
  echo "[$(date)] ✗ $1" >&2
  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    local message="TerraProxi — échec de la sauvegarde : $1"
    curl -sf -m 10 -H 'Content-Type: application/json' \
      -d "{\"text\":\"$message\",\"content\":\"$message\"}" "$ALERT_WEBHOOK_URL" > /dev/null || true
  fi
}
trap 'alert "erreur ligne $LINENO"' ERR

mkdir -p "$BACKUP_DIR"

# 1. Base : dump dans le conteneur du service "db" (la base n'est pas exposée à l'extérieur)
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_FILE"

# Une sauvegarde vide signale un échec silencieux de pg_dump
if [[ ! -s "$DB_FILE" ]] || [[ $(gzip -dc "$DB_FILE" | head -c 1 | wc -c) -eq 0 ]]; then
  rm -f "$DB_FILE"
  alert "dump PostgreSQL vide"
  exit 1
fi
echo "[$(date)] Base sauvegardée : $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"

# 2. Photos envoyées (volume monté sur /app/uploads dans le conteneur de l'API)
docker compose exec -T back tar -C /app/uploads -czf - . > "$UPLOADS_FILE"
echo "[$(date)] Photos sauvegardées : $UPLOADS_FILE ($(du -h "$UPLOADS_FILE" | cut -f1))"

# 3. Copie hors serveur : sans elle, la perte du serveur emporte aussi les sauvegardes
if [[ -n "${BACKUP_REMOTE:-}" ]]; then
  rclone copy "$BACKUP_DIR" "$BACKUP_REMOTE" --include "*_$TIMESTAMP.*"
  echo "[$(date)] Copie hors serveur : $BACKUP_REMOTE"
else
  echo "[$(date)] ⚠ BACKUP_REMOTE vide : aucune copie hors serveur" >&2
fi

find "$BACKUP_DIR" -name "*.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Purge des sauvegardes de plus de $RETENTION_DAYS jours terminée."
