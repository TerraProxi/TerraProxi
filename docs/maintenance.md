# TerraProxi — Documentation de maintenance

*Version 2 — 04/11/2026 — Équipe TerraProxi (projet 2427-25)*

Ce document décrit les opérations courantes pour maintenir la plateforme TerraProxi en production : déploiement, sauvegardes et restauration, supervision, mises à jour et gestion des incidents.

## 1. Environnement de production

| Élément | Détail |
|---------|--------|
| Serveur | VPS OVH, Ubuntu, Docker + Docker Compose v2 |
| Répertoire applicatif | `/opt/terraproxi` (clone du dépôt GitHub, branche `main`) |
| Conteneurs | `db` (PostgreSQL 16 + PostGIS), `back` (API Bun / Elysia, utilisateur non root), `front` (React servi par nginx non root, port 8080), `caddy` (reverse proxy HTTPS) |
| DNS / CDN | Cloudflare |
| Configuration | fichier `/opt/terraproxi/.env` (jamais versionné) |
| Paiement | Stripe (clés et secret de webhook dans `.env`) |

La base de données n'est accessible que depuis le réseau Docker interne : aucune connexion externe n'est possible.

## 2. Déploiement d'une nouvelle version

```bash
cd /opt/terraproxi
./infrastructure/docker/deploy.sh          # pull + build + redémarrage + healthcheck
./infrastructure/docker/deploy.sh --skip-build   # redémarrage sans reconstruire les images
```

Le script récupère la dernière version de `main`, reconstruit les images (`docker compose build`), redémarre les conteneurs, puis interroge `/health` pendant une minute. En cas d'échec, il affiche les 50 dernières lignes de journal de l'API et sort en erreur.

**Migrations** : le conteneur `back` applique les migrations en attente à chaque démarrage (`bun dist/db/migrate.js`), chacune dans une transaction, avant de lancer l'API. Une migration en échec empêche l'API de démarrer et `deploy.sh` le signale. Les scripts d'annulation se trouvent dans `infrastructure/database/migrations/down/`.

**Avant chaque déploiement :**

1. Vérifier que la branche `main` a été relue (pull request validée) et que les tests passent.
2. Lancer une sauvegarde manuelle de la base (voir §3).
3. Vérifier si de nouvelles migrations SQL ont été ajoutées dans `infrastructure/database/migrations/`, et que la CI GitHub Actions est verte.

**Retour arrière (rollback) :**

```bash
cd /opt/terraproxi
git log --oneline -5                 # repérer le commit précédent
git checkout <commit>                # revenir à la version stable
./infrastructure/docker/deploy.sh
```

Si une migration a modifié le schéma, jouer son script `down/` ou restaurer la sauvegarde prise avant le déploiement.

## 3. Sauvegardes et restauration

**Sauvegarde automatique** : quotidienne à 3 h (cron) via `infrastructure/docker/backup.sh`. Les dumps `.sql.gz` sont stockés dans `/opt/terraproxi/backups/` et conservés 30 jours.

```bash
# Crontab du serveur
0 3 * * * /opt/terraproxi/infrastructure/docker/backup.sh >> /var/log/terraproxi-backup.log 2>&1
```

Le script lit `POSTGRES_USER` et `POSTGRES_DB` dans `.env` (cron n'hérite d'aucune variable), passe par `docker compose exec` sur le service `db` et sort en erreur si le dump est vide.

**Sauvegarde manuelle** :

```bash
/opt/terraproxi/infrastructure/docker/backup.sh
```

**Copie hors serveur** : copier régulièrement les dumps vers un stockage externe (par exemple OVH Object Storage), afin de pouvoir reconstruire la plateforme si le serveur est perdu.

**Restauration** :

```bash
cd /opt/terraproxi && set -a && source .env && set +a
docker compose stop back
gunzip -c backups/terraproxi_AAAAMMJJ_HHMMSS.sql.gz \
  | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose start back
```

Tester la restauration une fois par mois sur un environnement de préproduction.

## 4. Supervision

| Contrôle | Comment | Fréquence |
|----------|---------|-----------|
| Santé de l'API | `GET /health` : 200 avec `"database":"up"`, **503** si PostgreSQL ne répond pas (healthcheck Docker et `deploy.sh`) | continue |
| État des conteneurs | `docker compose ps` | quotidienne |
| Journaux | `docker compose logs -f back` (ou `front`, `caddy`, `db`) | en cas d'alerte |
| Espace disque | `df -h` (sauvegardes, volumes Docker) | hebdomadaire |
| Certificat TLS | renouvelé automatiquement par Caddy ; vérifier la date d'expiration | mensuelle |
| Paiements | tableau de bord Stripe : webhooks en échec | quotidienne |

Mettre en place une alerte externe (service de surveillance de disponibilité) sur l'URL publique et sur `/health`.

## 5. Mises à jour

- **Système** : `sudo apt update && sudo apt upgrade` une fois par mois, et immédiatement pour un correctif de sécurité.
- **Images Docker** : mettre à jour les versions de PostgreSQL, Caddy et nginx en fixant une version précise, jamais `latest`.
- **Dépendances applicatives** : `pnpm outdated`, puis mise à jour sur une branche dédiée, tests et relecture avant fusion.
- **Application mobile** : nouvelle version publiée via Expo (EAS Build), puis soumission sur Google Play et l'App Store — procédure complète (eas init, variables, APK de test, iOS) dans [mobile-release.md](mobile-release.md). Les dépendances natives suivent le SDK Expo : les mettre à jour avec `npx expo install --fix` puis vérifier avec `npx expo-doctor`.

## 6. Gestion des secrets

- Les secrets (`JWT_SECRET`, clés Stripe, clé de l'API d'IA, mot de passe PostgreSQL) se trouvent uniquement dans `/opt/terraproxi/.env`.
- En cas de fuite supposée : régénérer le secret concerné, mettre à jour `.env`, redéployer. Changer `JWT_SECRET` déconnecte tous les utilisateurs.
- Ne jamais committer `.env` ; les clés de test (`sk_test_…`) sont réservées au développement.

## 7. Gestion des incidents

1. **Détecter** : alerte de supervision, message d'un utilisateur ou erreurs dans les journaux.
2. **Qualifier** : bloquant (service indisponible, paiements en échec), majeur (fonctionnalité dégradée) ou mineur.
3. **Corriger** : rollback si l'incident suit un déploiement ; sinon correctif sur une branche `fix/…`, relecture, puis déploiement.
4. **Communiquer** : informer les producteurs concernés (e-mail) si l'incident touche leurs commandes.
5. **Capitaliser** : consigner l'incident dans Trello (cause, correction, prévention).

## 8. Contacts

| Rôle | Personne |
|------|----------|
| Infrastructure / sauvegardes | Dunvael LE ROUX |
| API / back-end | Gaëtan FAUCHER |
| Web et mobile | Théo FREIHUBER, Mylo WIEREZ |
