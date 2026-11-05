# TerraProxi

[![CI](https://github.com/TerraProxi/TerraProxi/actions/workflows/ci.yml/badge.svg)](https://github.com/TerraProxi/TerraProxi/actions/workflows/ci.yml)

**Plateforme de vente directe de produits locaux** : les consommateurs trouvent les producteurs
autour d'eux, commandent et paient en ligne ; les producteurs gèrent catalogue, commandes, agenda
et statistiques depuis un back-office web.

[Site](https://terraproxi.fr) · [Prototype](https://prototype.terraproxi.fr) ·
[Trello](https://trello.com/b/ZnYYtcbs/open-innovation) · [Documentation](docs/)

---

## Fonctionnalités

| Consommateur (web et mobile) | Producteur (web) | Plateforme |
|------------------------------|------------------|------------|
| Carte et catalogue géolocalisés | Fiche de l'exploitation, photos | Rôles consommateur, producteur, administrateur |
| Panier multi-producteurs, paiement Stripe | Catalogue et stock | Notifications in-app et push (Expo) |
| Suivi et annulation des commandes | Traitement des commandes, remboursement | Assistant IA et newsletters (Gemini) |
| Messagerie avec les producteurs | Agenda des marchés et portes ouvertes | RGPD : consentement, export, droit à l'oubli |
| Agenda de proximité, assistant IA | Statistiques de vente, newsletter | Anti-abus, journaux, sauvegardes, alertes |

## Stack technique

| Couche | Technologie |
|--------|-------------|
| API | Bun + Elysia (TypeScript), validation TypeBox |
| Site web | React 18 + Vite, Leaflet |
| Application mobile | React Native + Expo SDK 51 |
| Base de données | PostgreSQL 16 + PostGIS |
| Paiement · IA · push | Stripe · Google Gemini · Expo Push |
| Hébergement | OVHcloud (France), Docker Compose, Caddy (TLS 1.3) |
| Qualité | OpenAPI 3.1 + Spectral, bun test, Vitest, Jest, GitHub Actions |

## Architecture

```
 Site web ─┐                    ┌─▶ PostgreSQL + PostGIS (réseau interne)
           ├─HTTPS─▶ Caddy ─▶ API ─┼─▶ Stripe (paiement, remboursement, webhook)
 Mobile ───┘                    ├─▶ Google Gemini (assistant, newsletter)
                                └─▶ Expo Push (notifications)
```

Détail : [architecture.md](architecture.md). Les contrats (OpenAPI, JSON Schema, Gherkin) et les
décisions d'architecture sont dans [specs/](specs/).

## Démarrage rapide

Prérequis : Node.js 20+, pnpm 9, Bun 1.3, Docker.

```bash
git clone https://github.com/TerraProxi/TerraProxi.git
cd TerraProxi && cp .env.example .env     # renseigner JWT_SECRET
pnpm install

docker compose -f docker-compose.dev.yml up -d db
pnpm db:migrate && pnpm db:seed           # schéma + données de démonstration

pnpm dev:api    # http://localhost:3002/swagger
pnpm dev:web    # http://localhost:3000
```

Comptes de démonstration (mot de passe `TerraProxi2026!`) : `jean@exemple.com` (consommateur),
`ferme@exemple.com` (producteur), `admin@terraproxi.fr` (administrateur).

Application mobile : voir [docs/setup.md](docs/setup.md) et [docs/mobile-release.md](docs/mobile-release.md).

## Qualité

```bash
pnpm spec:lint    # contrats OpenAPI
pnpm typecheck    # API, web, mobile
pnpm test         # 245 tests : API (conformité aux specs, intégration PostGIS), web, mobile
```

La CI exécute ces vérifications, construit les images Docker et vérifie que l'API démarre et migre
la base à chaque pull request.

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/setup.md](docs/setup.md) | Installation et variables d'environnement |
| [docs/api-specs.md](docs/api-specs.md) | Routes de l'API et limites anti-abus |
| [docs/guide-utilisateur.md](docs/guide-utilisateur.md) | Guide consommateur, producteur et administrateur |
| [docs/maintenance.md](docs/maintenance.md) | Déploiement, sauvegardes, supervision, incidents |
| [docs/mobile-release.md](docs/mobile-release.md) | Build et publication de l'application mobile |
| [docs/rgpd.md](docs/rgpd.md) | Conformité RGPD |
| [docs/tests.md](docs/tests.md) | Plan de tests, résultats et recette |
| [docs/projet/](docs/projet/) | Backlog produit et tâches de l'équipe |

## Contribuer

Branches, commits et pull requests : voir les
[règles de contribution](https://github.com/TerraProxi/.github/blob/main/CONTRIBUTING.md) de
l'organisation. Pour signaler une faille : [politique de sécurité](https://github.com/TerraProxi/.github/blob/main/SECURITY.md).

## Équipe

| Membre | Rôle |
|--------|------|
| Gaëtan FAUCHER | Backend, frontend, tests |
| Mylo WIEREZ | Backend, frontend |
| Théo FREIHUBER | Frontend, backend |
| Dunvael LE ROUX | Infrastructure, gestion de projet |
| Louis | IA et data, gestion de projet |

Projet 2427-25 — Cycle d'Innovation Digitale, EPSI Montpellier.
