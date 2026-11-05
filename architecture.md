# Architecture de la Solution TerraProxi

Ce document décrit l'architecture réellement implémentée : applications, API, base de données,
services tiers et déploiement. Les contrats détaillés (routes, schémas, scénarios) sont dans
`specs/` ; les choix structurants sont justifiés dans les ADR de `specs/decisions/`.

## 1. Architecture globale

```
 Navigateur ─HTTPS─▶ Caddy ─▶ front : site React (app.terraproxi.fr)
 Mobile ────HTTPS─▶ Caddy ─▶ back : API Bun + Elysia (gateway.terraproxi.fr)
                               │
                               ├─▶ PostgreSQL 16 + PostGIS (réseau interne)
                               ├─▶ Stripe (paiement, remboursement, webhook)
                               ├─▶ Google Gemini (assistant, newsletter)
                               └─▶ Expo Push (notifications mobiles)

 Caddy : TLS 1.3, certificats Let's Encrypt, en-têtes de sécurité
```

- **Monorepo pnpm** : `apps/api`, `apps/web`, `apps/mobile`, `packages/shared-types`, `specs/`.
- **Spec Driven Development** : les specs OpenAPI 3.1, JSON Schema et Gherkin font foi ; des tests
  de conformité vérifient que l'API et les specs décrivent exactement les mêmes 56 routes et que
  chaque réponse obtenue en test respecte son schéma.
- **Services tiers** : Stripe, Google Gemini, Expo Push, tuiles OpenStreetMap, Base Adresse
  Nationale (géocodage), Google Fonts (`specs/contracts/pact-overview.md`).

## 2. Applications clientes

### Site web — `apps/web` (React 18, Vite, TypeScript)

| Dossier | Rôle |
|---------|------|
| `pages/` | Écrans : public (accueil, carte, produits, fiches), consommateur (panier, paiement, commandes, messagerie, assistant), producteur (tableau de bord, catalogue, commandes, agenda, newsletter, profil), compte, administration, pages légales |
| `components/` | Composants réutilisables (en-tête avec cloche de notifications, carte Leaflet, courbe des ventes en SVG, envoi de photo, gardes de route par rôle) |
| `contexts/` | Authentification, panier multi-producteurs persistant, notifications |
| `services/` | Clients de l'API (axios) ; renouvellement automatique du jeton sur 401 |
| `styles/` | Charte (Montserrat, Open Sans, couleurs) avec variantes foncées pour un contraste AA ; mise en page responsive |

Le site sert à la fois les consommateurs et le back-office des producteurs (web responsive, CDC).

### Application mobile — `apps/mobile` (Expo SDK 51, React Native)

Application **consommateur** : carte et catalogue géolocalisés, fiches, panier multi-producteurs,
paiement Stripe (PaymentSheet), commandes, messagerie, notifications in-app et push, agenda,
assistant IA, compte et droits RGPD. Un compte producteur est renvoyé vers le back-office web.

| Dossier | Rôle |
|---------|------|
| `screens/`, `navigation/` | Écrans et navigation (onglets + piles) |
| `store/` | Session (jetons en SecureStore), panier et favoris (AsyncStorage) |
| `services/` | Client de l'API, push Expo, logique testable (commandes, favoris, rayon de carte) |

## 3. API — `apps/api` (Bun 1.3, Elysia 1.4, TypeScript)

| Dossier | Rôle |
|---------|------|
| `routes/` | Un module par domaine : auth, users, producers, products, orders, stripe, messages, notifications, events, uploads, ai, admin |
| `middlewares/` | `authGuard` : vérification du JWT, relecture du compte (actif, rôle) à chaque requête |
| `services/` | Cycle de vie des commandes (annulation, remboursement, expiration), Stripe, notifications et push, Gemini, stockage des photos, tâche de maintenance |
| `utils/` | Limitation anti-abus, journal JSON, validation des URL, jetons |
| `db/` | Pool PostgreSQL, migrations, jeu de démonstration, promotion d'un administrateur |

Points clés :
- validation TypeBox de chaque entrée ; requêtes SQL toujours paramétrées ;
- prix et montants lus en base, jamais envoyés par le client ; stock réservé par UPDATE conditionnel ;
- enveloppe d'erreur unique `{ error, status, details? }` ; 429 avec `Retry-After` en cas d'abus ;
- journal JSON par requête avec identifiant de corrélation (`X-Request-Id`) ; `/health` détaillé ;
- tâche périodique (5 min) : commandes non payées expirées, sessions expirées purgées.

## 4. Base de données (PostgreSQL 16 + PostGIS)

Schéma créé par les migrations versionnées de `infrastructure/database/migrations`
(chacune avec son script `down/`), appliquées au démarrage de l'API.

| Table | Contenu |
|-------|---------|
| `users` | Compte, rôle (CONSUMER, PRODUCER, ADMIN), consentement RGPD daté, consentement newsletter, jeton push |
| `producers` | Fiche de l'exploitation, position PostGIS (index GiST), horaires, vérification |
| `products` | Catalogue, prix, stock, catégorie, photo |
| `orders`, `order_items` | Commandes (une par producteur), mode de remise, références Stripe (paiement, remboursement) ; lignes avec le nom du produit figé |
| `messages` | Messagerie client ↔ producteur |
| `notifications` | Notifications in-app avec leur cible (commande, conversation, producteur) |
| `producer_events` | Agenda des producteurs |
| `newsletters` | Newsletters envoyées |
| `uploads` | Photos envoyées, rattachées à leur compte |
| `refresh_tokens` | Empreintes SHA-256 des sessions |

Droit à l'oubli : données personnelles supprimées, commandes conservées mais anonymisées (ADR 0003).

## 5. Déploiement et sécurité

- **Serveur OVH** (Union européenne) : `docker-compose.yml` avec Caddy, front, back et db ; la base
  n'est reliée qu'à un réseau interne sans accès à Internet ; conteneurs sans droits root.
- **Caddy** : certificats Let's Encrypt automatiques, TLS 1.3 uniquement, HSTS, politique de
  sécurité du contenu (CSP) limitée aux services tiers listés plus haut.
- **Authentification** : mots de passe bcrypt ; JWT d'accès de 15 min et refresh token opaque à
  usage unique (7 jours) ; protection contre la force brute ; secret JWT faible refusé en production.
- **Paiement** : Stripe uniquement ; le serveur ne voit jamais la carte (PCI-DSS) ; aucun client
  débité pour une commande annulée (ADR 0006).
- **Exploitation** : sauvegardes quotidiennes de la base et des photos avec copie hors serveur,
  surveillance toutes les 5 minutes avec alertes, déploiement précédé d'une sauvegarde
  (`docs/maintenance.md`) ; CI GitHub Actions : lint des specs, typage, tests API, web et mobile,
  build et démarrage des images Docker.
