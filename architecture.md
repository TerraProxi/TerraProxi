# Architecture de la Solution TerraProxi

Ce document présente l'architecture globale (Frontend, Backend et Base de Données) du projet TerraProxi, conformément au cahier des charges.

## 1. Architecture Globale

Le projet repose sur une architecture découplée (client-serveur) permettant une évolutivité et une maintenance facilitée.

- **Frontend** : Applications clientes (Web et Mobile) communiquant avec le Backend via des appels API REST/JSON.
- **Backend** : API centrale gérant la logique métier, l'authentification et l'interaction avec la base de données.
- **Base de données** : Stockage relationnel et spatial robuste.
- **Services Tiers** : Stripe (Paiement), OSM (Cartographie).

---

## 2. Architecture Frontend

### Technologies
- **Web** : React
- **Mobile** : React Native

### Structure Commune Recommandée

L'architecture frontend s'articule autour des concepts suivants :

*   **Pages / Écrans (Screens)** : Composants principaux représentant les vues de l'application (Accueil, Carte, Profil Producteur, Panier, etc.).
*   **Composants (Components)** : Composants UI réutilisables (Boutons, Cartes Produits, Modales) partageant la même charte graphique (Montserrat/Open Sans, couleurs définies).
*   **Services / API Clients** : Couche d'abstraction pour les appels à l'API backend (ex: Axios ou fetch). Gère les intercepteurs pour l'ajout du token JWT.
*   **Gestion d'état (State Management)** : Utilisation de Context API ou un outil comme Zustand/Redux pour gérer le panier, l'authentification et les préférences de l'utilisateur.
*   **Cartographie** : Intégration de Leaflet (Web) ou react-native-maps (Mobile) branché sur OpenStreetMap.

### Découpage Fonctionnel UX
1.  **Espace Public / Consommateur** : Inscription/Connexion, Carte géolocalisée, Recherche, Fiche Producteur, Panier, Checkout (Stripe).
2.  **Espace Producteur (Back-office web)** : Tableau de bord, Gestion du catalogue, Suivi des commandes, Messagerie.

---

## 3. Architecture Backend

### Technologies
- **Runtime** : Bun.js
- **Framework Web** : Elysia.js

### Structure de l'API (Architecture Modulaire)

Elysia.js permet une séparation claire des routes et des middlewares.

*   `src/`
    *   `controllers/` : Logique de traitement des requêtes (ex: `ProductController`, `UserController`).
    *   `models/` : Définition des schémas de données et interactions avec la BDD.
    *   `routes/` : Définition des endpoints API regroupés par domaine (ex: `/api/users`, `/api/products`).
    *   `middlewares/` : Vérification des JWT, gestion des rôles (Admin, Producteur, Consommateur), validation de la donnée.
    *   `services/` : Logique métier complexe, intégrations tierces (Service Stripe, Service IA).

### Endpoints Principaux (API REST)
*   **Auth** : `/api/auth/login`, `/api/auth/register` (Retourne un JWT).
*   **Utilisateurs** : `/api/users/profile`, `/api/users/settings`.
*   **Producteurs** : `/api/producers` (GET : avec paramètres de géolocalisation latitude/longitude et rayon).
*   **Produits** : `/api/products` (CRUD pour les producteurs, GET pour le catalogue).
*   **Commandes** : `/api/orders` (Création, historique, mise à jour du statut).
*   **Messagerie** : `/api/messages` (Échanges producteur-consommateur).

---

## 4. Architecture de la Base de Données

### Technologie
- **SGBD** : PostgreSQL
- **Extension Spatiale** : PostGIS (indispensable pour les requêtes de géolocalisation performantes basées sur OpenStreetMap).

### Modèle de Données (MCD / Schéma physique simplifié)

#### Table `users` (Utilisateurs)
- `id` (UUID, PK)
- `email` (Varchar, Unique)
- `password_hash` (Varchar)
- `role` (Enum: CONSUMER, PRODUCER, ADMIN)
- `created_at` (Timestamp)

#### Table `producers` (Détails Producteurs)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> users)
- `company_name` (Varchar)
- `description` (Text)
- `location` (Geometry/Point - PostGIS) : Pour la géolocalisation sur la carte.
- `address` (Varchar)

#### Table `products` (Catalogue)
- `id` (UUID, PK)
- `producer_id` (UUID, FK -> producers)
- `name` (Varchar)
- `description` (Text)
- `price` (Decimal)
- `stock` (Integer)
- `image_url` (Varchar)

#### Table `orders` (Commandes)
- `id` (UUID, PK)
- `consumer_id` (UUID, FK -> users)
- `producer_id` (UUID, FK -> producers)
- `status` (Enum: PENDING, PAID, PREPARING, READY, COMPLETED, CANCELLED)
- `total_price` (Decimal)
- `stripe_payment_id` (Varchar)
- `created_at` (Timestamp)

#### Table `order_items` (Lignes de commande)
- `id` (UUID, PK)
- `order_id` (UUID, FK -> orders)
- `product_id` (UUID, FK -> products)
- `quantity` (Integer)
- `unit_price` (Decimal)

#### Table `messages` (Messagerie intégrée)
- `id` (UUID, PK)
- `sender_id` (UUID, FK -> users)
- `receiver_id` (UUID, FK -> users)
- `content` (Text)
- `sent_at` (Timestamp)

---

## 5. Déploiement & Sécurité

### Infrastructure (OVH)
- Serveur VPS ou instances dédiées (ex: Public Cloud OVH).
- **Conteneurisation** : Utilisation de Docker pour isoler le backend, la base PostgreSQL/PostGIS et un reverse proxy (ex: Nginx).
- **HTTPS** : Certificat Let's Encrypt configuré sur le reverse proxy (TLS 1.3 requis par le cahier des charges).

### Flow de Sécurité
1. Le mot de passe n'est jamais stocké en clair (utilisation de bcrypt/argon2 par le backend).
2. L'authentification génère un token JWT signé avec une durée de vie limitée (gestion du `refresh_token` si besoin).
3. Le paiement passe **exclusivement** par Stripe via des Intents. Le backend ne voit jamais la carte bancaire.
4. Les endpoints de création de produits ou visualisation des commandes vérifient systématiquement que l'action est réalisée par le bon profil (`producer_id` correspondant au JWT).
