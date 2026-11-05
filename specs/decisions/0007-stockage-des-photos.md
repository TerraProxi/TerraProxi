# ADR-0007 : Stockage des photos envoyées

**Date** : 05/11/2026 — **Statut** : Acceptée

## Contexte

CAT-1 demande une photo par produit ; les producteurs n'avaient qu'un champ URL à remplir.
L'hébergement est un serveur OVH unique (CDC), sans stockage objet configuré.

## Options

1. Stockage objet (OVH Object Storage, S3) : scalable, mais un service et des clés de plus.
2. Fichiers sur disque dans un volume Docker, servis par l'API (choisi pour le MVP).

## Décision

- `POST /api/uploads` (multipart, champ `file`) : JPEG, PNG ou WebP, 5 Mo au maximum ; le type est
  déduit des premiers octets, jamais du nom ni de l'en-tête du client ; nom aléatoire (UUID).
- Fichiers dans `UPLOAD_DIR` (volume `uploads` en production), servis par `GET /api/uploads/{nom}`
  avec cache d'un an, `nosniff` et une CSP interdisant toute exécution.
- Table `uploads` : chaque fichier est rattaché à son compte et supprimé avec lui (RGPD).
- L'URL renvoyée est absolue (`PUBLIC_API_URL`), car l'application web est sur un autre domaine.

## Conséquences

- Le volume `uploads` doit être sauvegardé avec la base (`infrastructure/docker/backup.sh`).
- Passer à un stockage objet ne changerait que `services/upload-storage.ts` et l'URL renvoyée.
- Contrat : `specs/api/uploads-api.yaml` ; tests `apps/api/tests/integration/admin-security.test.ts`.
