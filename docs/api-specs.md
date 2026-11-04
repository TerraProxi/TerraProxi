# TerraProxi — Spécification API

> Contrats de référence : `specs/api/*.yaml` (OpenAPI 3.1, vérifiés par `pnpm spec:lint`).
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
| GET | `/health` | — | 200 `{"status":"ok","database":"up"}` ; 503 si la base ne répond pas |

### Auth

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | — | Inscription (consentement RGPD obligatoire) → utilisateur + jetons |
| POST | `/api/auth/login` | — | Connexion → utilisateur + jetons |
| POST | `/api/auth/refresh` | — | Rotation du refresh token |
| POST | `/api/auth/logout` | — | Révoque le refresh token |
| GET | `/api/auth/me` | ✅ | Utilisateur courant |

### Compte et RGPD

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/users/profile` | ✅ | Mon profil |
| PATCH | `/api/users/profile` | ✅ | Modifier prénom, nom, téléphone, avatar |
| PUT | `/api/users/me/password` | ✅ | Changer de mot de passe (révoque les sessions) |
| PUT | `/api/users/me/email` | ✅ | Changer d'email (mot de passe actuel requis) |
| GET | `/api/users/me/export` | ✅ | Export JSON de toutes mes données |
| DELETE | `/api/users/me` | ✅ | Supprimer mon compte (commandes anonymisées) |

### Producteurs

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/producers?lat&lon&radius&search&limit&offset` | — | Recherche (PostGIS `ST_DWithin`, tri par distance) ; `categories` déduites des produits |
| GET | `/api/producers/:id` | — | Fiche publique |
| GET | `/api/producers/me` | PRODUCER | Ma fiche (404 si pas encore créée) |
| POST | `/api/producers` | PRODUCER | Créer (201) ou mettre à jour (200) ma fiche |

### Produits

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/products?producer_id&category&available&search&limit&offset` | — | Catalogue public |
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

### Paiement Stripe

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/stripe/payment-intent` | CONSUMER (propriétaire) | Crée ou réutilise le PaymentIntent d'une commande PENDING |
| POST | `/api/stripe/webhook` | signature Stripe | `payment_intent.succeeded` → commande PAID |

### Messagerie

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/messages` | ✅ | Conversations (dernier message, non-lus), plus récentes d'abord |
| GET | `/api/messages/unread-count` | ✅ | Total de messages non lus |
| GET | `/api/messages/:partnerId?limit&before` | ✅ | Fil de discussion (marque les messages reçus comme lus) |
| POST | `/api/messages` | ✅ | Envoyer un message |

### IA

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/ai/chat` | ✅ | Assistant Gemini avec le catalogue des producteurs proches |
| GET | `/api/ai/recommendations` | ✅ | Produits populaires jamais achetés par l'utilisateur |
| GET | `/api/ai/forecast/:producerId` | PRODUCER (propriétaire) | Prévision hebdomadaire (moyenne mobile sur 8 semaines) |
