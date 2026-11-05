# language: fr
# Contrat : specs/api/events-api.yaml, specs/schemas/event.schema.json
# Vérifié par : apps/api/tests/integration/producer-tools.test.ts

Fonctionnalité: Agenda des producteurs (PROD-6)
  Un producteur annonce ses marchés, portes ouvertes et ventes à la ferme ; tout le monde
  peut consulter l'agenda, sans compte.

  Scénario: Publier un événement
    Étant donné un producteur à Montpellier
    Quand il ajoute le "Marché des Arceaux" dans deux jours
    Alors la réponse est 201
    Et l'événement apparaît dans l'agenda public du producteur
    Et dans l'agenda à moins de 10 km de Montpellier
    Mais pas dans l'agenda à moins de 10 km de Paris

  Scénario: Événements passés
    Étant donné un événement passé et un événement à venir
    Quand je consulte l'agenda public
    Alors seul l'événement à venir est renvoyé
    Quand je demande aussi les événements passés
    Alors les deux sont renvoyés
    Et le producteur voit les deux dans son agenda

  Scénario: Dates incohérentes
    Quand un producteur ajoute un événement qui finit avant de commencer
    Alors la réponse est 400

  Scénario: Seul le propriétaire modifie son agenda
    Quand un autre producteur modifie l'événement
    Alors la réponse est 403
    Quand un consommateur ajoute un événement
    Alors la réponse est 403
    Quand le propriétaire le modifie puis le supprime
    Alors l'événement est mis à jour puis supprimé (204)
