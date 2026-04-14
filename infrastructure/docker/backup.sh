#!/usr/bin/env bash
# Script de sauvegarde PostgreSQL — à exécuter via cron sur le serveur OVH
# Crontab suggéré : 0 3 * * * /opt/terraproxi/infrastructure/docker/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/terraproxi/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/terraproxi_$TIMESTAMP.sql.gz"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump via docker exec (la DB n'est pas exposée à l'extérieur)
docker exec "$(docker ps -qf 'name=db')" \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup créé : $BACKUP_FILE"

# Purge des sauvegardes de plus de RETENTION_DAYS jours
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Purge des backups > $RETENTION_DAYS jours terminée."
