# ADR-0005 : Force brute, révocation immédiate et URL saisies

**Date** : 05/11/2026 — **Statut** : Acceptée

## Contexte

Le cahier des charges exige une « protection contre les tentatives de connexion frauduleuses »,
la gestion d'un rôle administrateur et la protection contre les attaques XSS. L'audit du
05/11/2026 a relevé : aucune limite sur `/auth/login`, un jeton d'accès encore valide 15 min
après la suppression ou la suspension d'un compte, des URL `javascript:` acceptées dans les
photos et sites web, et un `JWT_SECRET` d'exemple accepté en production.

## Options

- Limitation : verrouillage du compte (bloque aussi le vrai propriétaire, déni de service facile)
  ou limitation par IP + email (choisie). Compteurs Redis (service de plus) ou en mémoire (choisi :
  une seule instance d'API).
- Révocation : liste noire de JWT ou relecture du compte à chaque requête (choisie : une requête
  indexée par appel, négligeable à notre échelle).

## Décision

- `utils/rate-limit.ts` : 5 échecs par IP + email, 30 échecs par IP sur 15 min, 10 inscriptions par
  IP par heure, 30 appels IA et 30 photos par compte par heure → 429 + `Retry-After`. Une connexion
  réussie remet le compteur du compte à zéro. Derrière Caddy, l'IP vient de `X-Forwarded-For`
  (`TRUST_PROXY=true`).
- Le temps de réponse ne révèle pas si un email existe (bcrypt comparé à une empreinte factice).
- `authGuard` relit `role` et `is_active` à chaque requête : suspension et suppression prennent effet
  immédiatement ; un changement de rôle aussi.
- Les URL saisies n'acceptent que `http(s)://` (motif partagé par les specs et `utils/validation.ts`).
- En production, l'API refuse de démarrer avec un `JWT_SECRET` de moins de 32 caractères ou
  contenant `CHANGE_ME`.

## Conséquences

- Plusieurs instances de l'API nécessiteraient des compteurs partagés (Redis ou PostgreSQL).
- Scénarios : `specs/features/auth.feature`, `admin.feature` ; tests :
  `apps/api/tests/integration/admin-security.test.ts`, `apps/api/tests/unit/security.test.ts`.
