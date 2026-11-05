# language: fr
# Contrat : specs/api/users-api.yaml — documentation : docs/rgpd.md
# Vérifié par : apps/api/tests/integration/rgpd-messages.test.ts, admin-security.test.ts,
#               producer-tools.test.ts

Fonctionnalité: Droits RGPD

  Scénario: Export de mes données
    Étant donné un consommateur avec une commande et un message
    Quand il exporte ses données
    Alors il reçoit un fichier JSON en pièce jointe avec son profil, sa commande et son message
    Et aucun hash de mot de passe
    Et la fiche producteur vaut null
    Quand un producteur exporte ses données
    Alors l'export contient sa fiche

  Scénario: Droit à l'oubli d'un consommateur
    Étant donné un consommateur avec une commande et un message
    Quand il supprime son compte
    Alors la réponse est 204
    Et son compte, ses messages et ses sessions sont supprimés
    Et sa commande est conservée avec consumer_id à null
    Et le producteur la voit au nom de "Client supprimé"
    Et son ancien jeton est refusé (401) dès la requête suivante

  Scénario: Droit à l'oubli d'un producteur
    Étant donné une commande contenant un produit du producteur
    Quand le producteur supprime son compte
    Alors le client voit toujours sa commande
    Et la ligne garde le nom du produit avec product_id à null

Fonctionnalité: Droit à l'oubli et commandes en cours

  Scénario: Producteur avec des commandes payées
    Étant donné un producteur ayant une commande payée non remise
    Quand il supprime son compte
    Alors la réponse est 409
    Quand la commande est remise
    Alors la suppression réussit

  Scénario: Commandes non payées
    Étant donné un client avec une commande en attente de paiement
    Quand il supprime son compte
    Alors la commande est annulée et le stock remis

  Scénario: Photos
    Étant donné un client ayant envoyé une photo
    Quand il supprime son compte
    Alors le fichier est effacé du disque

Fonctionnalité: Consentement aux newsletters
  Le consentement est facultatif, faux par défaut, et modifiable à tout moment
  (PATCH /users/profile, newsletter_opt_in). Voir back-office.feature.
