# TerraProxi — Guide de démarrage

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Bun   | 1.1+            |
| Node  | 20+             |
| pnpm  | 9+              |
| Docker Desktop | 26+ |
| Docker Compose | v2 (plugin) |

---

## Démarrage rapide en local (développement)

### 1. Cloner et installer

```bash
git clone https://github.com/TerraProxi/TerraProxi.git
cd TerraProxi
cp .env.example .env          # Remplir les valeurs manquantes
pnpm install
```

### 2. Lancer la base de données (PostgreSQL + PostGIS)

```bash
docker compose -f docker-compose.dev.yml up -d
```

La base est accessible sur `localhost:5432`.  
Les migrations SQL s'exécutent automatiquement au démarrage du conteneur (dossier `infrastructure/database/migrations/`).

### 3. Démarrer l'API

```bash
pnpm dev:api
# ➜ http://localhost:3002
# ➜ Swagger UI : http://localhost:3002/swagger
```

### 4. Démarrer le front web

```bash
pnpm dev:web
# ➜ http://localhost:3000
```

Le proxy Vite redirige `/api/*` vers `localhost:3002`.

### 5. Démarrer l'application mobile

```bash
cd apps/mobile
npx expo start
```

Scanner le QR code avec Expo Go (iOS/Android) ou lancer un émulateur.

---

## Variables d'environnement

Voir `.env.example` à la racine pour la liste complète.  
**Ne jamais committer le fichier `.env`** — il est dans `.gitignore`.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `JWT_SECRET` | Clé secrète JWT (32+ caractères aléatoires) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (sk_test_ en dev) |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe (côté front) |

---

## Architecture des dossiers

```
TerraProxi/
├── apps/
│   ├── api/        # Bun + Elysia.js (port 3002)
│   ├── web/        # React + Vite (port 3000)
│   └── mobile/     # React Native + Expo
├── packages/
│   └── shared-types/   # Types TypeScript communs
├── infrastructure/
│   ├── database/migrations/  # Scripts SQL versionnés
│   └── docker/   # Scripts backup + deploy
├── docs/           # Documentation
├── docker-compose.yml       # Production
├── docker-compose.dev.yml   # Développement local
├── Caddyfile       # Reverse proxy HTTPS
└── .env.example
```

---

## Déploiement OVH

Voir [`notes_projet.md`](../notes_projet.md) pour le détail complet (OVH, Cloudflare, Docker).

Résumé rapide :

```bash
# Sur le serveur OVH (en tant qu'admin)
cd /opt/terraproxi
./infrastructure/docker/deploy.sh
```

Le script : pull le code → build les images → redémarre les conteneurs → vérifie le healthcheck.

---

## Sauvegardes automatiques

Configurer le cron sur le serveur :

```bash
# Sauvegarde quotidienne à 3h du matin
0 3 * * * /opt/terraproxi/infrastructure/docker/backup.sh
```

Les dumps `.sql.gz` sont conservés 30 jours dans `/opt/terraproxi/backups/`.

---

## Tests

```bash
# Tests unitaires API (à implémenter avec bun:test)
cd apps/api && bun test

# Vérification TypeScript
pnpm lint
```

Pour les tests Stripe, utiliser les cartes de test Stripe :
- Succès : `4242 4242 4242 4242`
- Refus : `4000 0000 0000 0002`
