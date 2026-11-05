# TerraProxi — Guide d'installation

## Prérequis

| Outil | Version |
|-------|---------|
| Node.js | 20+ |
| pnpm | 9 (`corepack enable` ou `npm i -g pnpm@9`) |
| Bun | 1.3+ (exécute l'API et ses tests) |
| Docker Desktop / Docker Engine | 26+ avec Compose v2 |

> **Windows** : clonez le dépôt dans un chemin court (ex. `C:\dev\TerraProxi`). Les dossiers
> `node_modules/.pnpm` dépassent sinon la limite de 260 caractères et Bun ne trouve plus ses modules.

---

## Démarrage en local

### 1. Cloner, configurer, installer

```bash
git clone https://github.com/TerraProxi/TerraProxi.git
cd TerraProxi
cp .env.example .env
pnpm install
```

Dans `.env`, remplacez au minimum `JWT_SECRET` (`openssl rand -base64 48`). Les valeurs par
défaut de `DATABASE_URL` et `TEST_DATABASE_URL` correspondent à la base de dev ci-dessous.

### 2. Base PostgreSQL + PostGIS

```bash
docker compose -f docker-compose.dev.yml up -d db
pnpm db:migrate    # crée / met à jour le schéma (infrastructure/database/migrations)
pnpm db:seed       # 21 comptes, 20 producteurs, 31 produits, commandes de démo
```

Comptes de démonstration (mot de passe `SEED_PASSWORD`, par défaut `TerraProxi2026!`) :

| Rôle | Email |
|------|-------|
| Consommateur | `jean@exemple.com` |
| Producteur (Ferme des Garrigues) | `ferme@exemple.com` |

Les migrations et le seed sont idempotents : on peut les relancer sans risque.

### 3. API

```bash
pnpm dev:api
# http://localhost:3002/health   → {"status":"ok","database":"up"}
# http://localhost:3002/swagger  → documentation interactive
```

L'API refuse de démarrer sans `DATABASE_URL` ni `JWT_SECRET`. Si PostgreSQL tombe, `/health`
renvoie **503** : il n'y a plus de données de secours fictives.

### 4. Site web

```bash
pnpm dev:web
# http://localhost:3000
```

Laissez `VITE_API_URL` vide en dev : Vite redirige `/api` vers l'API locale (port `API_PORT` du `.env`).

### 5. Application mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile
```

- Émulateur Android : l'API est jointe via `10.0.2.2` automatiquement.
- Téléphone physique : mettez l'IP locale du PC dans `EXPO_PUBLIC_API_URL`
  (ex. `http://192.168.1.20:3002/api`), téléphone et PC sur le même Wi-Fi.
- Le paiement Stripe natif nécessite un *development build* (`eas build --profile development`),
  il ne fonctionne pas dans Expo Go. Le reste de l'application fonctionne dans Expo Go.
- Builds Android/iOS, variables (`GOOGLE_MAPS_ANDROID_API_KEY`, `EAS_PROJECT_ID`…) et publication :
  voir [mobile-release.md](mobile-release.md).

**Monorepo et `node-linker=hoisted`.** Le fichier `.npmrc` à la racine demande à pnpm une
arborescence `node_modules` « à plat » (comme npm), pour tout le monorepo. C'est la recommandation
du guide Expo *Work with monorepos* pour le SDK 51 : avec les `node_modules` isolés de pnpm
(liens symboliques), Metro ne résout pas les dépendances transitives d'`expo`
(`expo-modules-core` introuvable à l'export) et l'autolinking natif n'est pas garanti.
`apps/mobile/metro.config.js` complète ce réglage : il surveille la racine du dépôt,
cherche les modules dans `apps/mobile/node_modules` puis `node_modules`, et désactive la
recherche hiérarchique pour ne jamais charger deux copies de React. L'API et le web n'en sont
pas affectés. Après avoir changé ce réglage, supprimer tous les dossiers `node_modules` puis
relancer `pnpm install`.

### Tout en conteneurs (sans Node local)

```bash
docker compose -f docker-compose.dev.yml up -d --build
# web : http://localhost:3000 — API : http://localhost:3002
docker compose -f docker-compose.dev.yml exec api bun dist/db/seed.js
```

---

## Paiement Stripe en local

1. Clés de test sur <https://dashboard.stripe.com/test/apikeys> → `STRIPE_SECRET_KEY` et
   `VITE_STRIPE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_STRIPE_KEY`.
2. Relayer les webhooks vers l'API :
   ```bash
   stripe listen --forward-to localhost:3002/api/stripe/webhook
   ```
   Copier le secret `whsec_…` affiché dans `STRIPE_WEBHOOK_SECRET`.
3. Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque. Refus : `4000 0000 0000 0002`.

Sans clés Stripe, l'API répond 503 sur le paiement et le site affiche « paiement non configuré » ;
le reste de l'application fonctionne.

## Assistant IA

Renseigner `GEMINI_API_KEY` (<https://aistudio.google.com/apikey>). Sans clé, `/api/ai/chat` répond 503.

---

## Vérifications

```bash
pnpm spec:lint     # specs OpenAPI (Spectral)
pnpm typecheck     # TypeScript : API, web, mobile
pnpm test          # tests API — nécessite TEST_DATABASE_URL (base VIDÉE à chaque exécution)
pnpm build:web
```

Créer la base de test une fois :

```bash
docker compose -f docker-compose.dev.yml exec db createdb -U app_user terraproxi_test
```

Les mêmes vérifications tournent dans GitHub Actions (`.github/workflows/ci.yml`) à chaque push et
pull request, ainsi que le build des images Docker et un test de démarrage de l'API.

---

## Variables d'environnement

Liste complète et commentée : [`.env.example`](../.env.example). Le `.env` n'est jamais committé.

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion PostgreSQL de l'API |
| `TEST_DATABASE_URL` | Base des tests d'intégration (vidée à chaque exécution) |
| `JWT_SECRET` | Signature des jetons d'accès (32+ caractères aléatoires) |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Durées : 15 min / 7 jours |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiement côté API |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe du site |
| `VITE_API_URL` | URL publique de l'API pour le build de production du site |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Assistant IA |
| `CORS_ORIGINS` | Origines autorisées en production |
| `SEED_PASSWORD` | Mot de passe des comptes de démo |

---

## Arborescence

```
TerraProxi/
├── apps/
│   ├── api/        # Bun + Elysia (port 3002) — src/, tests/
│   ├── web/        # React + Vite (port 3000)
│   └── mobile/     # React Native + Expo
├── specs/          # Contrats : OpenAPI, JSON Schema, Gherkin, ADR
├── infrastructure/
│   ├── database/migrations/   # SQL versionné (+ down/ pour annuler)
│   └── docker/                # deploy.sh, backup.sh
├── docs/
├── docker-compose.yml       # Production
├── docker-compose.dev.yml   # Développement
└── Caddyfile                # Reverse proxy HTTPS
```

## Production

Déploiement, sauvegardes, supervision et incidents : [`docs/maintenance.md`](maintenance.md).
