# language: fr
# Contrat : specs/api/messages-api.yaml, specs/schemas/message.schema.json
# Vérifié par : apps/api/tests/integration/rgpd-messages.test.ts

Fonctionnalité: Messagerie

  Scénario: Échange entre un consommateur et un producteur
    Étant donné un consommateur et un producteur
    Quand le consommateur envoie "  Bonjour, des tomates samedi ?  " puis "Merci !"
    Alors le premier message est enregistré sans les espaces en bord
    Et le producteur a 2 messages non lus
    Et sa boîte de réception contient une conversation avec le dernier message "Merci !"
    Quand le producteur ouvre le fil de discussion
    Alors les deux messages sont renvoyés dans l'ordre chronologique
    Et il n'a plus de message non lu
    Et la boîte de réception du consommateur affiche le nom de l'exploitation

  Scénario: Messages refusés
    Quand j'envoie un message à moi-même
    Alors la réponse est 400
    Quand j'envoie un message contenant uniquement des espaces
    Alors la réponse est 400
    Quand j'envoie un message à un utilisateur inexistant
    Alors la réponse est 404
