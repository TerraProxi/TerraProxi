# TerraProxi — Backlog produit (référence Trello)

Board Trello : https://trello.com/b/ZnYYtcbs/open-innovation

> Chaque section correspond à une **liste Trello**. Chaque sous-entrée est une **carte** avec le format `[EPIC-N] Titre`.

---

## Liste : Backlog (à prioriser)

### EPIC 1 — Authentification & Gestion des rôles
- [AUTH-1] Inscription consommateur (email, mot de passe, nom)
- [AUTH-2] Inscription producteur (+ infos entreprise, localisation)
- [AUTH-3] Connexion avec JWT (access token + refresh token)
- [AUTH-4] Déconnexion et invalidation du token
- [AUTH-5] Middleware de vérification du rôle (CONSUMER / PRODUCER / ADMIN)
- [AUTH-6] Modification du mot de passe / email

### EPIC 2 — Profil & Géolocalisation producteurs
- [PROD-1] Création du profil producteur (nom entreprise, description, localisation GPS)
- [PROD-2] Modification du profil producteur
- [PROD-3] Recherche géolocalisée : GET /api/producers?lat=&lon=&radius=
- [PROD-4] Carte interactive (Leaflet / OSM) avec marqueurs producteurs
- [PROD-5] Fiche producteur publique (photo, description, liste produits, horaires)
- [PROD-6] Agenda d'événements producteur

### EPIC 3 — Catalogue produits
- [CAT-1] Création d'un produit (nom, prix, stock, photo, catégorie)
- [CAT-2] Modification d'un produit
- [CAT-3] Suppression d'un produit
- [CAT-4] Liste publique du catalogue avec filtres (catégorie, dispo, distance)
- [CAT-5] Fiche produit détaillée (consommateur)
- [CAT-6] Gestion du stock en temps réel

### EPIC 4 — Panier & Commandes
- [ORDER-1] Ajout au panier (context côté frontend)
- [ORDER-2] Visualisation et édition du panier
- [ORDER-3] Création d'une commande depuis le panier
- [ORDER-4] Suivi du statut commande (PENDING → PAID → PREPARING → READY → COMPLETED)
- [ORDER-5] Historique commandes consommateur
- [ORDER-6] Tableau de bord commandes producteur (voir, préparer, finaliser)
- [ORDER-7] Annulation d'une commande (CANCELLED)

### EPIC 5 — Paiement Stripe
- [PAY-1] Création d'un PaymentIntent côté serveur
- [PAY-2] Intégration Stripe Elements côté web
- [PAY-3] Intégration Stripe SDK côté mobile
- [PAY-4] Webhook Stripe → mise à jour statut commande en PAID
- [PAY-5] Aucune donnée bancaire stockée (PCI-DSS compliance)

### EPIC 6 — Messagerie interne
- [MSG-1] Envoi de message consommateur → producteur
- [MSG-2] Réponse producteur → consommateur
- [MSG-3] Liste des conversations (boîte de réception)
- [MSG-4] Lecture/non-lu (badge de notification)

### EPIC 7 — Notifications
- [NOTIF-1] Notification "nouvelle commande" pour le producteur
- [NOTIF-2] Notification "commande prête" pour le consommateur
- [NOTIF-3] Notification "nouveau message" pour les deux parties
- [NOTIF-4] Push mobile (FCM / APNs) — optionnel MVP

### EPIC 8 — Back-office producteur
- [BO-1] Tableau de bord : chiffre du jour, commandes en attente, stock faible
- [BO-2] Gestion du catalogue (liste, ajouter, modifier, supprimer)
- [BO-3] Suivi et gestion des commandes
- [BO-4] Messagerie intégrée
- [BO-5] Statistiques de vente (courbes, top produits)

### EPIC 9 — Infrastructure & DevOps
- [INFRA-1] Monorepo pnpm workspaces (api / web / mobile)
- [INFRA-2] Docker Compose local (db PostGIS + api + web)
- [INFRA-3] Migrations SQL versionnées (PostGIS, schéma complet)
- [INFRA-4] Variables d'environnement centralisées (.env.example)
- [INFRA-5] Caddy reverse proxy + TLS automatique
- [INFRA-6] Déploiement OVH (docker compose pull + up -d)
- [INFRA-7] Sauvegardes PostgreSQL automatisées (pg_dump cron)
- [INFRA-8] Monitoring basique (healthcheck endpoint + logs)

### EPIC 10 — Conformité & Documentation
- [RGPD-1] Consentement explicite à l'inscription
- [RGPD-2] Politique de confidentialité
- [RGPD-3] Mentions légales
- [RGPD-4] API "droit à l'oubli" (suppression compte + données)
- [DOC-1] Documentation API (Swagger / OpenAPI auto-généré par Elysia)
- [DOC-2] Guide déploiement (README setup.md)
- [DOC-3] Guide utilisateur consommateur
- [DOC-4] Guide utilisateur producteur

### EPIC 11 — Extensions post-MVP (IA & data)
- [AI-1] Module prévision des ventes (historique → ML)
- [AI-2] Recommandations produits personnalisées
- [AI-3] Chatbot FAQ / support
- [AI-4] Newsletter automatique générée par IA

---

## Liste : Sprint en cours

> Déplacer les cartes ici lors du sprint actif (2 semaines).

---

## Liste : En cours

> Cartes sur lesquelles un membre travaille activement.

---

## Liste : Review / Tests

> Tâche codée, en attente de relecture ou de tests.

---

## Liste : Terminé ✓

> Tâches validées par l'équipe.

---

## Jalons suggérés

| Jalon | Contenu | Durée estimée |
|-------|---------|---------------|
| J1 | API auth + DB PostGIS + Docker local | 2 semaines |
| J2 | Producteurs géo + Catalogue + Carte web | 3 semaines |
| J3 | Commandes + Stripe bout en bout + Messagerie | 3 semaines |
| J4 | Back-office producteur + Mobile parcours principal | 4 semaines |
| J5 | OVH production + Documentation + Tests | 2 semaines |
| J6 | Extensions IA + Newsletter | Post-MVP |

---

## Attribution des tâches (CDC §7)

| Membre | Rôle principal | Épics assignés |
|--------|----------------|----------------|
| Gaëtan | Backend + Tests | EPIC 1, 2, 3, 9 |
| Mylo | Backend + Frontend | EPIC 4, 5, 8 |
| Théo | Frontend + Backend | EPIC 3, 6, 7, 8 |
| Dunvael | Infra + Gestion projet | EPIC 9, 10 |
| Louis | IA & data + Gestion projet | EPIC 11, 10 |
