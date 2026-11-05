# TerraProxi — Spécification API

> Contrats de référence : `specs/api/*.yaml` (OpenAPI 3.1) et `specs/schemas/*.json`. Le lint (`pnpm spec:lint`)
> et les tests de conformité (`pnpm test`) garantissent que l'API leur correspond exactement — voir `specs/README.md`.
> Documentation interactive générée par Elysia : `https://gateway.terraproxi.fr/swagger`
> (production) ou `http://localhost:3002/swagger` (dev).

## Authentification

Les routes protégées attendent `Authorization: Bearer <access_token>`.

- `access_token` : JWT signé, valable 15 minutes, contient l'identifiant et le rôle.
- `refresh_token` : jeton opaque valable 7 jours, **à usage unique**, échangé sur
  `POST /api/auth/refresh` contre une nouvelle paire. Le web et le mobile le font automatiquement
  à la première réponse 401.

Rôles : `CONSUMER`, `PRODUCER`, `ADMIN`. Un rôle insuffisant renvoie 403.

## Format des erreurs

Toutes les erreurs suivent `specs/contracts/error-envelope.schema.json` :

```json
{ "error": "Données invalides", "status": 400, "details": { "field": "password", "message": "…" } }
```

| Code | Cas |
|------|-----|
| 400 | Corps, paramètre ou identifiant invalide ; règle métier (stock, adresse) |
| 401 | Jeton absent, invalide ou expiré |
| 403 | Rôle insuffisant ou ressource d'un autre utilisateur |
| 404 | Ressource introuvable |
| 409 | Conflit : email déjà utilisé, transition de statut interdite |
| 503 | PostgreSQL, Stripe ou Gemini indisponible / non configuré |

## Endpoints

### Supervision

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/health` | — | 200 : base, latence, durée de fonctionnement, Stripe et IA configurés ou non ; 503 si la base ne répond pas |

### Auth

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | — | Inscription (consentement RGPD obligatoire) → utilisateur + jetons |
| POST | `/api/auth/login` | — | Connexion → utilisateur + jetons ; 429 après 5 échecs (IP + email) en 15 min |
| POST | `/api/auth/refresh` | — | Rotation du refresh token |
| POST | `/api/auth/logout` | — | Révoque le refresh token |
| GET | `/api/auth/me` | ✅ | Utilisateur courant |

### Compte et RGPD

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/users/profile` | ✅ | Mon profil |
| PATCH | `/api/users/profile` | ✅ | Modifier prénom, nom, téléphone, avatar, consentement newsletter |
| PUT | `/api/users/me/push-token` | ✅ | Jeton Expo Push de l'appareil mobile (null pour le retirer) |
| PUT | `/api/users/me/password` | ✅ | Changer de mot de passe (révoque les sessions) |
| PUT | `/api/users/me/email` | ✅ | Changer d'email (mot de passe actuel requis) |
| GET | `/api/users/me/export` | ✅ | Export JSON de toutes mes données |
| DELETE | `/api/users/me` | ✅ | Supprimer mon compte (commandes anonymisées, photos effacées) ; 409 si un producteur a des commandes payées en cours |

### Producteurs

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/producers?lat&lon&radius&search&limit&offset` | — | Recherche (PostGIS `ST_DWithin`, tri par distance) ; `categories` déduites des produits |
| GET | `/api/producers/:id` | — | Fiche publique |
| GET | `/api/producers/me` | PRODUCER | Ma fiche (404 si pas encore créée) |
| POST | `/api/producers` | PRODUCER | Créer (201) ou mettre à jour (200) ma fiche |
| GET | `/api/producers/me/stats?days` | PRODUCER | Tableau de bord et statistiques de vente (BO-1, BO-5) |
| GET | `/api/producers/me/newsletters` | PRODUCER | Newsletters envoyées |
| POST | `/api/producers/me/newsletters` | PRODUCER | Envoyer une newsletter aux clients abonnés (une par 24 h) |

### Produits

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/products?producer_id&category&available&search&lat&lon&radius&limit&offset` | — | Catalogue public ; avec une position, filtré et trié par distance (`distance_km`) |
| GET | `/api/products/:id` | — | Fiche produit |
| GET | `/api/products/mine` | PRODUCER | Mon catalogue, produits masqués compris |
| POST | `/api/products` | PRODUCER | Créer un produit |
| PUT | `/api/products/:id` | PRODUCER (propriétaire) | Modifier |
| DELETE | `/api/products/:id` | PRODUCER (propriétaire) | Supprimer |

Catégories : `FRUITS_VEGETABLES`, `DAIRY`, `MEAT`, `BEVERAGES`, `FINE_GROCERY`, `CRAFTS`,
`FLOWERS_PLANTS`, `OTHER`.

### Commandes

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/orders` | CONSUMER | Commande chez un producteur ; prix lus en base, stock réservé atomiquement |
| GET | `/api/orders?status&limit&offset` | ✅ | Mes commandes (client) ou commandes reçues (producteur) |
| GET | `/api/orders/:id` | client ou producteur concerné | Détail |
| PATCH | `/api/orders/:id/status` | client ou producteur concerné | Changer le statut (voir ci-dessous) |

Cycle de vie (`apps/api/src/services/order-status.ts`) :

```
PENDING ──(webhook Stripe)──▶ PAID ──▶ PREPARING ──▶ READY ──▶ COMPLETED
   └────────────────▶ CANCELLED ◀───────┴───────────┘
```

- Producteur : PAID → PREPARING → READY → COMPLETED ; annulation jusqu'à PREPARING.
- Client : annulation uniquement tant que la commande est PENDING.
- Toute annulation remet les quantités en stock. Une transition interdite renvoie 409.
- Annulation d'une commande non payée : le paiement en cours est annulé chez Stripe (409 s'il vient
  d'être validé). Annulation d'une commande payée : remboursement intégral (502 si Stripe ne répond pas).
- Une commande non payée au bout de `ORDER_PENDING_TTL_MINUTES` (60) est annulée automatiquement.

### Paiement Stripe

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/stripe/payment-intent` | CONSUMER (propriétaire) | Crée ou réutilise le PaymentIntent d'une commande PENDING |
| POST | `/api/stripe/webhook` | signature Stripe | `payment_intent.succeeded` → commande PAID (remboursée si annulée entre-temps) ; `payment_intent.payment_failed` → client prévenu |

### Messagerie

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/messages` | ✅ | Conversations (dernier message, non-lus), plus récentes d'abord |
| GET | `/api/messages/unread-count` | ✅ | Total de messages non lus |
| GET | `/api/messages/:partnerId?limit&before` | ✅ | Fil de discussion (marque les messages reçus comme lus) |
| POST | `/api/messages` | ✅ | Envoyer un message (client ↔ producteur ; 403 entre deux clients) |

### Notifications

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/notifications?unread_only&limit&offset` | ✅ | Mes notifications, plus récentes d'abord |
| GET | `/api/notifications/unread-count` | ✅ | Badge de la cloche |
| PATCH | `/api/notifications/:id/read` | ✅ | Marquer comme lue |
| POST | `/api/notifications/read-all` | ✅ | Tout marquer comme lu |

Types : `NEW_ORDER` (commande payée, producteur), `ORDER_STATUS` (en préparation, prête, annulée,
expirée), `PAYMENT` (confirmé, refusé, remboursé), `NEW_MESSAGE`, `NEWSLETTER`, `ACCOUNT`
(exploitation vérifiée). Chaque notification part aussi en push Expo si l'appareil a un jeton.

### Agenda des producteurs

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/events?producer_id&lat&lon&radius&include_past&limit&offset` | — | Événements à venir |
| GET | `/api/events/mine` | PRODUCER | Mon agenda, passé compris |
| POST | `/api/events` | PRODUCER | Ajouter un événement |
| PUT | `/api/events/:id` | PRODUCER (propriétaire) | Modifier |
| DELETE | `/api/events/:id` | PRODUCER (propriétaire) | Supprimer |

### Photos

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/uploads` | ✅ | Envoi multipart (`file`) : JPEG, PNG ou WebP, 5 Mo max → `{url}` |
| GET | `/api/uploads/:filename` | — | Photo (cache un an) |

### Administration

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/admin/stats` | ADMIN | Indicateurs de la plateforme |
| GET | `/api/admin/users?role&search&limit&offset` | ADMIN | Comptes |
| PATCH | `/api/admin/users/:id` | ADMIN | Suspendre / réactiver (effet immédiat) |
| GET | `/api/admin/producers?verified&limit&offset` | ADMIN | Producteurs, à vérifier d'abord |
| PATCH | `/api/admin/producers/:id` | ADMIN | Vérifier un producteur |

Un compte ADMIN est créé par `pnpm db:seed` (`admin@terraproxi.fr`) ou promu avec
`pnpm --filter @terraproxi/api db:promote-admin <email>`.

### IA

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/ai/chat` | ✅ | Assistant Gemini avec le catalogue des producteurs proches (30 appels IA par heure) |
| POST | `/api/ai/newsletter` | PRODUCER | Brouillon de newsletter rédigé à partir du catalogue et de l'agenda |
| GET | `/api/ai/recommendations` | ✅ | Produits populaires jamais achetés par l'utilisateur |
| GET | `/api/ai/forecast/:producerId` | PRODUCER (propriétaire) | Prévision hebdomadaire (moyenne mobile sur 8 semaines) |

## Limites anti-abus

| Action | Limite | Réponse |
|--------|--------|---------|
| Échecs de connexion | 5 par IP + email, 30 par IP, sur 15 min | 429 + `Retry-After` |
| Inscriptions | 10 par IP et par heure | 429 |
| Appels IA (chat, newsletter) | 30 par compte et par heure | 429 |
| Photos | 30 par compte et par heure, 5 Mo chacune | 429 / 413 |
| Newsletters | 1 par producteur et par 24 h | 429 |

Seuils réglables par `RATE_LIMIT_*` (voir `apps/api/src/utils/rate-limit.ts`).
