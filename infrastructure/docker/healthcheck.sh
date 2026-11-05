#!/usr/bin/env bash
# Surveillance de disponibilité — à lancer par cron toutes les 5 minutes (docs/maintenance.md)
# Crontab : */5 * * * * /opt/terraproxi/infrastructure/docker/healthcheck.sh >> /var/log/terraproxi-health.log 2>&1
#
# Vérifie l'API (/health) et le site. Prévient ALERT_WEBHOOK_URL (Slack / Discord / Mattermost)
# au passage en panne et au retour à la normale, pas à chaque passage.

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/terraproxi}"
STATE_FILE="${STATE_FILE:-/var/tmp/terraproxi-health.state}"
API_HEALTH_URL="${API_HEALTH_URL:-https://gateway.terraproxi.fr/health}"
WEB_URL="${WEB_URL:-https://app.terraproxi.fr/}"
DISK_ALERT_PERCENT="${DISK_ALERT_PERCENT:-85}"

if [[ -f "$APP_DIR/.env" ]]; then set -a; source "$APP_DIR/.env"; set +a; fi

notify() {
  echo "[$(date)] $1"
  [[ -z "${ALERT_WEBHOOK_URL:-}" ]] && return 0
  curl -sf -m 10 -H 'Content-Type: application/json' \
    -d "{\"text\":\"TerraProxi — $1\",\"content\":\"TerraProxi — $1\"}" "$ALERT_WEBHOOK_URL" > /dev/null || true
}

problems=()

health=$(curl -s -m 10 "$API_HEALTH_URL" || true)
if ! grep -q '"status":"ok"' <<< "$health"; then
  problems+=("API indisponible ou base en panne ($API_HEALTH_URL)")
fi

if ! curl -sf -m 10 -o /dev/null "$WEB_URL"; then
  problems+=("site web injoignable ($WEB_URL)")
fi

disk_used=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if (( disk_used >= DISK_ALERT_PERCENT )); then
  problems+=("disque plein à ${disk_used} %")
fi

previous=$(cat "$STATE_FILE" 2>/dev/null || echo ok)
if (( ${#problems[@]} )); then
  current=$(IFS='; '; echo "${problems[*]}")
  [[ "$current" != "$previous" ]] && notify "ALERTE : $current"
  echo "$current" > "$STATE_FILE"
  exit 1
fi

[[ "$previous" != ok ]] && notify "rétabli : API, site et disque OK"
echo ok > "$STATE_FILE"
