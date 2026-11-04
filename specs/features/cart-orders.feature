# language: fr
# Contrat : specs/api/orders-api.yaml, specs/api/stripe-api.yaml,
#           specs/schemas/cart.schema.json, specs/schemas/order.schema.json
# Vérifié par : apps/api/tests/integration/orders.test.ts, stripe-ai.test.ts,
#               apps/api/tests/unit/order-status.test.ts
# Le panier est tenu par le client (web, mobile) ; il est envoyé à la validation, une commande par producteur.

Fonctionnalité: Passer commande

  Scénario: Commande valide
    Étant donné un produit à 4,50 € avec 10 en stock
    Quand un consommateur commande 3 unités
    Alors la réponse est 201 avec le statut "PENDING" et un total de 13,50 €
    Et le stock restant est 7

  Scénario: Stock insuffisant
    Étant donné un produit avec 2 en stock
    Quand un consommateur en commande 3
    Alors la réponse est 400
    Et le stock reste à 2

  Scénario: Commandes simultanées
    Étant donné un produit avec 5 en stock
    Quand 8 consommateurs en commandent 1 en même temps
    Alors 5 commandes sont créées et 3 sont refusées avec 400
    Et le stock vaut 0

  Scénario: Produit d'un autre producteur
    Quand je commande au producteur A un produit du producteur B
    Alors la réponse est 400

  Scénario: Livraison sans adresse
    Quand je commande en livraison sans adresse
    Alors la réponse est 400

  Scénario: Un producteur ne commande pas
    Étant donné un producteur connecté
    Quand il passe commande
    Alors la réponse est 403

Fonctionnalité: Paiement

  Scénario: Paiement de la commande
    Étant donné une commande PENDING de 13,50 €
    Quand son client demande un PaymentIntent
    Alors un intent de 1350 centimes est créé
    Et une seconde demande réutilise le même intent
    Quand Stripe envoie "payment_intent.succeeded" avec une signature valide
    Alors la commande passe en "PAID"

  Scénario: Webhook non authentique ou incohérent
    Quand le webhook arrive avec une signature invalide
    Alors la réponse est 400
    Quand le webhook concerne un autre intent que celui de la commande
    Alors la commande reste "PENDING"

  Scénario: Paiement refusé
    Quand un client demande le paiement de la commande d'un autre
    Alors la réponse est 403
    Quand Stripe n'est pas configuré sur le serveur
    Alors la réponse est 503

Fonctionnalité: Suivi et annulation

  Scénario: Le producteur fait avancer une commande payée
    Étant donné une commande "PENDING"
    Quand le producteur la passe en "PREPARING"
    Alors la réponse est 409
    Étant donné la commande payée
    Quand le producteur la passe successivement en "PREPARING", "READY" puis "COMPLETED"
    Alors chaque changement répond 200

  Scénario: Le client annule une commande non payée
    Étant donné une commande "PENDING" de 4 unités
    Quand le client l'annule
    Alors la commande passe en "CANCELLED"
    Et les 4 unités sont remises en stock

  Scénario: Le client ne peut plus annuler une commande payée
    Étant donné une commande "PAID"
    Quand le client l'annule
    Alors la réponse est 409

  Scénario: Commande d'un tiers
    Quand un autre consommateur consulte ou modifie la commande
    Alors la réponse est 403
