# TerraProxi — Spécification API

> La documentation interactive complète est générée automatiquement par Elysia.js et disponible à :  
> `https://gateway.terraproxi.fr/swagger` (production) ou `http://localhost:3002/swagger` (dev)

---

## Authentification

Tous les endpoints protégés requièrent un header :

```
Authorization: Bearer <access_token>
```

Le token est obtenu lors de la connexion (`POST /api/auth/login`) ou de l'inscription.

---

## Endpoints

### Auth

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Inscription (email, mot de passe, RGPD) |
| POST | `/api/auth/login` | ❌ | Connexion — retourne un JWT |
| GET | `/api/auth/me` | ✅ | Profil de l'utilisateur courant |

### Users

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/users/profile` | ✅ | Mon profil complet |
| PATCH | `/api/users/profile` | ✅ | Modifier mon profil |
| DELETE | `/api/users/me` | ✅ | Supprimer mon compte (RGPD) |

### Producteurs

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/producers` | ❌ | Liste / recherche géolocalisée |
| GET | `/api/producers/:id` | ❌ | Fiche d'un producteur |
| POST | `/api/producers` | ✅ PRODUCER | Créer / mettre à jour son profil |

**Paramètres de géolocalisation pour `GET /api/producers` :**

| Param | Type | Description |
|-------|------|-------------|
| `lat` | number | Latitude (WGS84) |
| `lon` | number | Longitude (WGS84) |
| `radius` | number | Rayon en km (défaut : 30) |
| `search` | string | Recherche texte libre |
| `limit` | number | Pagination (défaut : 20) |
| `offset` | number | Décalage (défaut : 0) |

### Produits

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/products` | ❌ | Catalogue avec filtres |
| GET | `/api/products/:id` | ❌ | Détail d'un produit |
| POST | `/api/products` | ✅ PRODUCER | Créer un produit |
| PUT | `/api/products/:id` | ✅ PRODUCER | Modifier son produit |
| DELETE | `/api/products/:id` | ✅ PRODUCER | Supprimer son produit |

### Commandes

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/orders` | ✅ CONSUMER | Créer une commande |
| GET | `/api/orders` | ✅ | Mes commandes (selon rôle) |
| GET | `/api/orders/:id` | ✅ | Détail d'une commande |
| PATCH | `/api/orders/:id/status` | ✅ PRODUCER | Avancer le statut |

**Cycle de vie d'une commande :**
```
PENDING → PAID (via Stripe webhook) → PREPARING → READY → COMPLETED
       ↘                                                  ↗
                         CANCELLED
```

### Paiements Stripe

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/stripe/payment-intent` | ✅ CONSUMER | Créer un PaymentIntent |
| POST | `/api/stripe/webhook` | ❌ (signature Stripe) | Webhook — passage PAID |

### Messages

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/messages` | ✅ | Liste des conversations |
| GET | `/api/messages/:partnerId` | ✅ | Thread d'une conversation |
| POST | `/api/messages` | ✅ | Envoyer un message |

---

## Codes de retour

| Code | Signification |
|------|--------------|
| 200 | Succès |
| 201 | Ressource créée |
| 204 | Suppression réussie (pas de corps) |
| 400 | Données invalides |
| 401 | Token manquant ou invalide |
| 403 | Rôle insuffisant |
| 404 | Ressource introuvable |
| 409 | Conflit (ex: email déjà utilisé) |
| 500 | Erreur serveur |

Toutes les erreurs retournent :
```json
{ "error": "Message d'erreur", "statusCode": 4xx }
```
