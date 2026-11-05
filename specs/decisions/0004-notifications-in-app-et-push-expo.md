# ADR-0004 : Notifications in-app et push Expo

**Date** : 05/11/2026 — **Statut** : Acceptée

## Contexte

Le cahier des charges liste les notifications parmi les fonctionnalités (EPIC 7) : nouvelle
commande pour le producteur, commande prête pour le client, nouveau message pour les deux.
Le push mobile (NOTIF-4) est optionnel pour le MVP. L'équipe n'a ni serveur de messagerie
temps réel ni compte Firebase.

## Options

1. WebSocket / Server-Sent Events : temps réel, mais une connexion ouverte par client et une
   reprise à gérer sur mobile.
2. Firebase Cloud Messaging + APNs en direct : deux intégrations, des certificats, un compte Google.
3. Table `notifications` lue par les applications (cloche + compteur interrogé toutes les
   60 s) et push via le service Expo Push, déjà inclus dans le SDK Expo de l'application mobile.

## Décision

Option 3 (migration `003_notifications_agenda_admin.sql`, `services/notifications.service.ts`) :

- une ligne par notification, avec une cible (`ORDER`, `CONVERSATION`, `PRODUCER`) ouverte au clic ;
- le mobile enregistre son jeton (`PUT /users/me/push-token`) ; un jeton n'appartient qu'à un compte ;
- l'envoi se fait après la transaction métier ; une erreur de notification est journalisée,
  jamais propagée : elle ne fait pas échouer une commande ou un paiement ;
- un jeton signalé `DeviceNotRegistered` par Expo est effacé ;
- messages : une seule notification non lue par interlocuteur (pas de rafale pendant une discussion).

## Conséquences

- Contrat : `specs/api/notifications-api.yaml`, `specs/schemas/notification.schema.json`,
  scénarios `specs/features/notifications.feature`.
- Pas de temps réel strict : le badge se met à jour en moins d'une minute, le push est immédiat.
- `PUSH_NOTIFICATIONS_ENABLED=false` coupe le push (notifications in-app conservées).
- Les notifications sont exportées (`GET /users/me/export`) et supprimées avec le compte.
