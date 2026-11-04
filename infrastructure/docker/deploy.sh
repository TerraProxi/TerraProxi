#!/usr/bin/env bash
# Déploiement sur le serveur OVH — voir docs/maintenance.md
# Usage : ./infrastructure/docker/deploy.sh [--skip-build]
# Prérequis : Docker + docker compose, dépôt cloné dans /opt/terraproxi, .env renseigné

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/terraproxi}"
HEALTH_URL="${HEALTH_URL:-https://gateway.terraproxi.fr/health}"
HEALTH_RETRIES=12
cd "$APP_DIR"

echo "=== TerraProxi — Déploiement $(date) ==="

# 1. Dernière version du code
git pull --ff-only origin main
echo "--- Version : $(git rev-parse --short HEAD)"

# 2. Build des images (contexte = racine du dépôt, cf. docker-compose.yml)
if [[ "${1:-}" != "--skip-build" ]]; then
  echo "--- Build des images API et front..."
  docker compose build back front
fi

# 3. Redémarrage : l'API applique ses migrations au démarrage
echo "--- Redémarrage des conteneurs..."
docker compose pull caddy db
docker compose up -d --remove-orphans

# 4. Vérification : /health renvoie 200 uniquement si PostgreSQL répond
echo "--- Attente du healthcheck API..."
for attempt in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -sf "$HEALTH_URL" | grep -q '"status":"ok"'; then
    echo "✓ API opérationnelle (tentative $attempt)"
    echo "=== Déploiement terminé avec succès ==="
    exit 0
  fi
  sleep 5
done

echo "✗ L'API ne répond pas — derniers logs :"
docker compose logs --tail=50 back
exit 1
