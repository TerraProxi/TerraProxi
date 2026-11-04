# specs/ — contrats de TerraProxi

Les specs sont la référence : toute évolution de l'API les modifie dans la même pull request.
La CI échoue si le code et les specs divergent (voir « Vérification »).

## Contenu

```
specs/
├── api/                      # OpenAPI 3.1, un fichier par domaine
│   ├── auth-api.yaml           # inscription, connexion, refresh, logout, /auth/me
│   ├── users-api.yaml          # profil, mot de passe, email, export et suppression RGPD
│   ├── producers-api.yaml      # recherche géolocalisée, fiches producteurs
│   ├── products-api.yaml       # catalogue public, catalogue du producteur
│   ├── orders-api.yaml         # commandes et cycle de vie
│   ├── stripe-api.yaml         # PaymentIntent, webhook
│   ├── messages-api.yaml       # messagerie
│   ├── ai-chat-api.yaml        # assistant IA, recommandations, prévisions
│   └── health-api.yaml         # /health
├── schemas/                  # JSON Schema 2020-12 des entités, référencés par les specs OpenAPI
│   ├── user, producer, product, order, order-item, message (+ Conversation)
│   ├── cart.schema.json        # corps de POST /orders (panier d'un producteur)
│   └── ai-chat.schema.json     # requête / réponse de l'assistant
├── contracts/
│   ├── error-envelope.schema.json   # format de toutes les erreurs : {error, status, details?}
│   └── pact-overview.md             # services tiers (Stripe, Gemini, Base Adresse Nationale)
├── features/                 # scénarios Gherkin (français), chacun relié à son test
└── decisions/                # ADR
    ├── 0001-api-origin.md                       # monolithe Elysia + PostGIS (amendé)
    ├── 0002-postgresql-only-and-contract-tests.md
    └── 0003-rgpd-anonymisation-des-commandes.md
```

Chaque entité n'est définie qu'une fois : les fichiers OpenAPI référencent `../schemas/*.json`
et `../contracts/error-envelope.schema.json` au lieu de recopier les schémas.

## Vérification

| Contrôle | Commande | Ce qui est vérifié |
|----------|----------|--------------------|
| Lint | `pnpm spec:lint` | Validité OpenAPI 3.1 et règles Spectral (`spectral.json`) |
| Routes | `pnpm test` → `apps/api/tests/conformance/routes.test.ts` | Mêmes routes, paramètres de requête et champs de corps entre l'API et `specs/api` ; aucune route décrite deux fois |
| Réponses | `pnpm test` → tests d'intégration | Chaque réponse obtenue doit avoir un code documenté et un corps conforme au schéma (champs en trop refusés) |
| Scénarios | `pnpm test` | Chaque scénario de `features/` cite le fichier de test qui le vérifie |

Les tests d'intégration ont besoin de `TEST_DATABASE_URL` (voir `docs/setup.md`). Sans elle,
seuls le lint, le contrôle des routes et les tests unitaires s'exécutent.

## Faire évoluer l'API

1. Modifier la spec (et le schéma de l'entité si besoin), puis `pnpm spec:lint`.
2. Ajouter ou adapter le scénario dans `features/` et son test d'intégration.
3. Implémenter, puis `pnpm test` : les tests de conformité signalent tout écart restant.
4. Changement incompatible : nouvelle version de l'API et ADR dans `decisions/`.
