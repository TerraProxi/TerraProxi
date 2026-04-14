# TerraProxi

**Plateforme numérique de vente directe de produits locaux** — connecte producteurs régionaux et consommateurs via géolocalisation, commande en ligne et paiement sécurisé.

[Trello](https://trello.com/b/ZnYYtcbs/open-innovation) · [Google Drive](https://drive.google.com/drive/folders/12dV795-BKScuyefmGTMGYR7o9EStFGy-) · [Prototype](https://prototype.terraproxi.fr/)

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| API Backend | Bun.js + Elysia.js (TypeScript) |
| Frontend Web | React 18 + Vite |
| Application Mobile | React Native + Expo |
| Base de données | PostgreSQL 16 + PostGIS |
| Cartographie | OpenStreetMap (Leaflet / react-native-maps) |
| Paiements | Stripe (Payment Intents) |
| Reverse Proxy / HTTPS | Caddy (TLS automatique) |
| Hébergement | OVH (Ubuntu, Docker) |
| DNS / CDN | Cloudflare |

## Architecture

```
Clients (Web + Mobile)
         │ HTTPS
    ┌────▼────┐
    │  Caddy  │ TLS + reverse proxy
    └────┬────┘
         │ réseau Docker interne
    ┌────▼────┐    ┌──────────┐
    │   API   │───▶│ PostgreSQL│
    │ (Bun)   │    │ + PostGIS │
    └─────────┘    └──────────┘
         │
    ┌────▼────┐
    │  Stripe │ (paiements uniquement)
    └─────────┘
```

## Démarrage rapide

```bash
# Cloner et installer
git clone https://github.com/TerraProxi/TerraProxi.git
cd TerraProxi && cp .env.example .env
pnpm install

# Lancer la DB (PostgreSQL + PostGIS)
docker compose -f docker-compose.dev.yml up -d

# API : http://localhost:3002/swagger
pnpm dev:api

# Web : http://localhost:3000
pnpm dev:web
```

Voir [`docs/setup.md`](docs/setup.md) pour le guide complet.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/setup.md](docs/setup.md) | Installation et déploiement |
| [docs/api-specs.md](docs/api-specs.md) | Endpoints API |
| [docs/guide-utilisateur.md](docs/guide-utilisateur.md) | Guide consommateur & producteur |
| [docs/rgpd.md](docs/rgpd.md) | Conformité RGPD |
| [docs/tests.md](docs/tests.md) | Plan de tests |
| [BACKLOG.md](BACKLOG.md) | Backlog produit (référence Trello) |
| [architecture.md](architecture.md) | Architecture détaillée |
| [folder_structure.md](folder_structure.md) | Structure des dossiers |

## Équipe

| Membre | Rôle |
|--------|------|
| FAUCHER Gaëtan | Backend, Tests |
| FREIHUBER Théo | Frontend, Backend |
| LE ROUX Dunvael | Infrastructure, Gestion projet |
| WIEREZ Mylo | Backend, Frontend |
