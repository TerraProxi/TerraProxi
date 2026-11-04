# ADR-0003 : Droit à l'oubli et conservation des commandes

**Date** : 04/11/2026 — **Statut** : Acceptée

## Contexte

Le RGPD impose d'effacer les données d'une personne qui supprime son compte. Les commandes
sont aussi des pièces comptables, à conserver 10 ans (Code de commerce, art. L123-22).
Les clés étrangères initiales (migration 001) empêchaient toute suppression de compte ayant
passé ou reçu une commande.

## Options

1. Supprimer les commandes avec le compte (perte des pièces comptables).
2. Désactiver le compte sans rien supprimer (non conforme au droit à l'effacement).
3. Supprimer les données personnelles et anonymiser les commandes.

## Décision

Option 3 (migration `002_rgpd_orders_producers.sql`) :

- messages, sessions, fiche producteur et produits : supprimés (`ON DELETE CASCADE`) ;
- commandes : conservées, `consumer_id` / `producer_id` passent à NULL (`ON DELETE SET NULL`) ;
- lignes de commande : `product_name` figé à la commande, `product_id` à NULL si le produit disparaît.

## Conséquences

- `DELETE /api/users/me` fonctionne pour tous les comptes ; l'export `GET /api/users/me/export`
  couvre le droit d'accès et la portabilité.
- Les schémas `order.schema.json` et `order-item.schema.json` déclarent ces champs nullables ;
  les écrans affichent « Client supprimé ».
- Vérifié par `apps/api/tests/integration/rgpd-messages.test.ts` et `specs/features/rgpd.feature`.
