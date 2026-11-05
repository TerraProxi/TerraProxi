# ADR-0006 : Annulation, remboursement et expiration des commandes

**Date** : 05/11/2026 — **Statut** : Acceptée

## Contexte

L'audit du 05/11/2026 a montré qu'un client pouvait être débité pour une commande annulée :
annulation pendant la saisie de la carte (le webhook ignorait ensuite le paiement), annulation
par le producteur d'une commande payée sans remboursement, double clic créant deux paiements.
Les commandes jamais payées bloquaient aussi le stock indéfiniment.

## Décision

- **Paiement** : la commande est verrouillée (`SELECT … FOR UPDATE`) pendant la création du
  PaymentIntent ; un second appel simultané reçoit le même intent.
- **Annulation d'une commande non payée** : le PaymentIntent est annulé chez Stripe dans la
  transaction ; s'il est déjà validé (`succeeded` / `processing`), l'annulation est refusée (409)
  et le webhook la fera passer en PAID.
- **Annulation d'une commande payée** (producteur) : remboursement intégral avant la validation
  de la transaction, avec la clé d'idempotence `refund-{orderId}` ; si Stripe ne répond pas → 502
  et rien n'est modifié.
- **Paiement reçu pour une commande annulée** : le webhook rembourse aussitôt et notifie le client.
- **Expiration** : une tâche toutes les 5 minutes annule les commandes PENDING de plus de
  `ORDER_PENDING_TTL_MINUTES` (60 par défaut), libère le stock et prévient le client.
- **Suppression de compte** : commandes non payées annulées ; un producteur ayant des commandes
  payées non remises reçoit 409 (il doit les remettre ou les annuler, donc rembourser).

## Conséquences

- Contrat : `specs/api/orders-api.yaml` (409, 502, 503), `specs/api/stripe-api.yaml`,
  scénarios `specs/features/cart-orders.feature` ; tests `apps/api/tests/integration/payments.test.ts`.
- La tâche de maintenance suppose une seule instance d'API (verrous `SKIP LOCKED` : deux
  instances ne traiteraient pas deux fois la même commande, mais feraient le travail en double).
