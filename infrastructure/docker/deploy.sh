#!/usr/bin/env bash
# Script de déploiement sur le serveur OVH
# Usage : ./deploy.sh [--skip-build]
# Prérequis : Docker, docker compose, fichier .env présent dans /opt/terraproxi

set -euo pipefail

APP_DIR="/opt/terraproxi"
cd "$APP_DIR"

echo "=== TerraProxi — Déploiement $(date) ==="

# 1. Récupérer la dernière version du code
git pull origin main

# 2. Build des images (sauf si --skip-build)
if [[ "${1:-}" != "--skip-build" ]]; then
  echo "--- Build de l'image API..."
  docker build -t terraproxi-back:latest ./apps/api

  echo "--- Build de l'image Front..."
  docker build -t terraproxi-front:latest ./apps/web
fi

# 3. Redémarrage des services
echo "--- Redémarrage des conteneurs..."
docker compose pull caddy  # Màj de Caddy si besoin
docker compose up -d --force-recreate back front caddy

# 4. Vérification du healthcheck
echo "--- Attente du healthcheck API..."
sleep 5
curl -sf https://gateway.terraproxi.fr/health | grep -q '"status":"ok"' \
  && echo "✓ API répond correctement" \
  || (echo "✗ API ne répond pas !" && exit 1)

echo "=== Déploiement terminé avec succès ==="
