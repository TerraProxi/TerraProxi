# Architecture des Dossiers et Fichiers - TerraProxi

Voici une proposition de structure de répertoires (Monorepo) séparant proprement le frontend (Web & Mobile) du backend (API) et des configurations d'infrastructure.

```text
TerraProxi/
├── apps/
│   ├── web/                     # Application Frontend Web (React / Vite)
│   │   ├── public/              # Assets statiques (favicon, images publiques)
│   │   ├── src/
│   │   │   ├── assets/          # Images, logos, icônes, fonts
│   │   │   ├── components/      # Composants réutilisables (Button, Card, Modal, etc.)
│   │   │   ├── contexts/        # React Contexts (AuthContext, CartContext)
│   │   │   ├── hooks/           # Custom hooks (useAuth, useGeolocation)
│   │   │   ├── layouts/         # Layouts de pages (MainLayout, ProducerLayout)
│   │   │   ├── pages/           # Vues principales / Pages
│   │   │   │   ├── public/      # Home, Search, Producteur
│   │   │   │   ├── producer/    # Dashboard, Commandes, Catalogue
│   │   │   │   └── consumer/    # Profil, Historique
│   │   │   ├── services/        # Appels API (Axios/fetch configuration)
│   │   │   ├── styles/          # Fichiers CSS / SCSS globaux (variables de la charte)
│   │   │   ├── utils/           # Fonctions utilitaires (formatters, helpers)
│   │   │   ├── App.jsx          # Point d'entrée des routes
│   │   │   └── main.jsx         # Point de montage React
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── mobile/                  # Application Mobile (React Native / Expo)
│   │   ├── assets/              # Icônes, splash screen, fonts
│   │   ├── src/
│   │   │   ├── components/      # Composants UI React Native
│   │   │   ├── navigation/      # Configuration des routeurs (Stack, Tab)
│   │   │   ├── screens/         # Écrans de l'app (MapScreen, CartScreen)
│   │   │   ├── services/        # Appels API (partagés ou recopiés du web)
│   │   │   ├── store/           # Redux / Zustand (ou Context)
│   │   │   └── utils/           # Utilitaires
│   │   ├── App.js               # Point d'entrée RN
│   │   ├── app.json             # Configuration Expo
│   │   └── package.json
│   │
│   └── api/                     # Backend (Bun.js + Elysia.js)
│       ├── src/
│       │   ├── controllers/     # Logique de traitement des requêtes
│       │   │   ├── auth.controller.ts
│       │   │   ├── user.controller.ts
│       │   │   ├── product.controller.ts
│       │   │   └── order.controller.ts
│       │   ├── middlewares/     # Intercepteurs (JWT, validation, rôles)
│       │   │   ├── auth.middleware.ts
│       │   │   └── role.middleware.ts
│       │   ├── models/          # Définitions des schémas/DTO (ou Prisma schema)
│       │   ├── routes/          # Déclaration des URLs de l'API
│       │   │   ├── auth.routes.ts
│       │   │   ├── product.routes.ts
│       │   │   └── order.routes.ts
│       │   ├── services/        # Logique métier et appels externes
│       │   │   ├── stripe.service.ts
│       │   │   ├── email.service.ts
│       │   │   └── db.service.ts
│       │   ├── utils/           # Helpers (hash, geo-math)
│       │   └── index.ts         # Point d'entrée de l'API (serveur Elysia)
│       ├── .env                 # Variables d'environnement (PORT, DB_URL, STRIPE_KEY)
│       ├── bunfig.toml          # Configuration Bun
│       └── package.json
│
├── packages/                    # (Optionnel) Code partagé entre les apps
│   ├── shared-types/            # Types TypeScript communs (interfaces API)
│   └── ui-kit/                  # Composants UI purs partagés (si web/mobile unifiés)
│
├── infrastructure/              # Fichiers de configuration DevOps
│   ├── docker/                  # Dockerfiles et configurations
│   ├── database/                # Scripts SQL, migrations (PostGIS)
│   │   ├── init.sql
│   │   └── migrations/
│   ├── nginx/                   # Configuration du Reverse Proxy
│   └── docker-compose.yml       # Orchestration locale / production
│
├── docs/                        # Documentation complète
│   ├── architecture.md
│   ├── api-specs.md             # Spécifications Swagger / OpenAPI
│   └── setup.md
│
├── .gitignore
├── package.json                 # Package.json root (Workspaces)
└── README.md
```

### Explications de l'Architecture

1.  **Monorepo (`apps/`)** : regroupe le backend, le front web et le front mobile dans le même dépôt pour faciliter le partage de code (comme les types TypeScript ou des constantes) et synchroniser les versions.
2.  **Séparation des responsabilités** :
    *   **`controllers/` et `routes/` (Backend)** : séparation claire entre la définition de la route (le "chemin") et le traitement (le "contrôleur").
    *   **`services/` (Backend & Frontend)** : isole la logique métier complexe (Stripe) ou les appels réseau pour ne pas surcharger les vues ou les contrôleurs.
    *   **`components/` vs `pages/` (Frontend)** : sépare l'UI réutilisable (les boutons, champs de texte) des layouts qui assemblent plusieurs composants pour former un écran complet.
3.  **Infrastructure** : un dossier dédié pour `docker-compose`, les scripts SQL d'initialisation (PostgreSQL+PostGIS) et la configuration du serveur web (Nginx), permettant aux développeurs de lancer l'environnement complet facilement.
