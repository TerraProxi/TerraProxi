# language: fr
# Contrat : specs/api/notifications-api.yaml, specs/schemas/notification.schema.json,
#           specs/api/users-api.yaml (PUT /users/me/push-token)
# Vérifié par : apps/api/tests/integration/notifications.test.ts, payments.test.ts

Fonctionnalité: Notifications (EPIC 7)
  Les clients et les producteurs sont prévenus des événements qui les concernent, dans
  l'application (cloche) et en push sur le mobile.

  Scénario: Nouvelle commande payée (NOTIF-1)
    Étant donné un producteur ayant enregistré le jeton push de son téléphone
    Quand un client paie une commande de 2 articles chez lui
    Alors le producteur reçoit la notification "Nouvelle commande à préparer" liée à la commande
    Et une notification push part vers son téléphone
    Et le client reçoit la notification "Paiement confirmé"

  Scénario: Commande prête (NOTIF-2)
    Étant donné une commande payée à retirer chez le producteur
    Quand le producteur la passe en préparation, puis prête, puis remise
    Alors le client reçoit "Commande en préparation" puis "Commande prête"
    Et le texte l'invite à venir la retirer
    Et la remise de la commande ne génère pas de notification

  Scénario: Nouveau message sans rafale (NOTIF-3)
    Quand un client envoie deux messages de suite à un producteur
    Alors le producteur n'a qu'une notification, avec l'aperçu du premier message
    Quand le producteur lit la conversation
    Alors la notification est marquée comme lue
    Et le message suivant du client crée une nouvelle notification

  Scénario: Paiement refusé
    Quand Stripe signale l'échec du paiement d'une commande
    Alors le client reçoit "Paiement refusé" et la commande reste payable

  Scénario: Lecture des notifications
    Quand un utilisateur marque une notification d'un autre compte comme lue
    Alors la réponse est 404
    Quand il marque la sienne comme lue
    Alors elle est lue
    Quand il marque tout comme lu
    Alors son compteur de non-lues vaut 0

  Scénario: Jeton push de l'appareil (NOTIF-4)
    Quand j'enregistre un jeton qui n'a pas le format Expo
    Alors la réponse est 400
    Quand un second compte se connecte sur le même téléphone et enregistre le même jeton
    Alors le jeton n'appartient plus qu'au second compte
    Quand j'envoie un jeton null
    Alors le jeton est retiré
