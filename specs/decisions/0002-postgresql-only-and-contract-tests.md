# ADR-0002 : PostgreSQL seul et tests de conformité aux specs

**Date** : 04/11/2026 — **Statut** : Acceptée

## Contexte

L'API basculait sur un jeu de données en mémoire dès qu'une requête SQL échouait (base
indisponible, contrainte violée). Ce mode imitait le SQL par recherche de texte et utilisait
un mot de passe commun. Conséquences observées : suppression de compte « réussie » sans effet,
données fictives servies en production, comportements différents entre dev et prod.
En parallèle, les specs `specs/` avaient divergé du code (routes, champs, codes de retour).

## Options

1. Conserver le mode en mémoire, l'activer explicitement par variable d'environnement.
2. Supprimer ce mode ; charger les données de démonstration dans PostgreSQL.

## Décision

Option 2. L'API ne parle qu'à PostgreSQL ; `pnpm db:seed` charge le jeu de démonstration
(UUID stables, idempotent). `/health` répond 503 si la base est indisponible.

Pour empêcher toute nouvelle divergence entre specs et code :

- `tests/conformance/routes.test.ts` compare les routes, paramètres de requête et champs de corps
  de l'API (OpenAPI généré par Elysia) à `specs/api/*.yaml` ;
- chaque appel des tests d'intégration passe par `assertResponseConforms` : le code HTTP doit être
  documenté et le corps doit respecter le schéma de la spec (`additionalProperties: false`).

## Conséquences

- Une seule source de données, testée en conditions réelles.
- Docker (ou un PostgreSQL local) est nécessaire pour développer et pour les tests d'intégration.
- Toute évolution d'API doit modifier `specs/` dans la même pull request, sinon la CI échoue.

## Specs liées

`specs/api/*.yaml`, `specs/schemas/*.schema.json`, `specs/contracts/error-envelope.schema.json`
