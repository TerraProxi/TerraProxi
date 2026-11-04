# TerraProxi — Plan de tests et de recette

*Version 2 — 04/11/2026*

## 1. Stratégie

| Niveau | Outil | Où | Quand |
|--------|-------|----|-------|
| Contrats d'API | Spectral (règles OpenAPI) | `specs/api/*.yaml` | `pnpm spec:lint`, CI |
| Conformité aux specs | `bun test` + Ajv | `apps/api/tests/conformance` | `pnpm test`, CI |
| Typage | TypeScript strict | API, web, mobile | `pnpm typecheck`, CI |
| Unitaires | `bun test` | `apps/api/tests/unit` | `pnpm test`, CI |
| Intégration | `bun test` + PostgreSQL/PostGIS réel | `apps/api/tests/integration` | `pnpm test`, CI (service PostGIS) |
| Déploiement | build des images + démarrage du conteneur API | `.github/workflows/ci.yml` | CI |
| Recette | parcours manuels ci-dessous | web, mobile | avant chaque soutenance / mise en production |

Les tests d'intégration appellent l'application Elysia en mémoire (`app.handle`) contre une vraie
base : ils exercent les requêtes SQL, les contraintes et les transactions. Stripe est remplacé
par un faux client à la frontière du contrat (aucun appel réseau). La base de test
(`TEST_DATABASE_URL`) est vidée avant chaque test ; sans cette variable les tests d'intégration
sont ignorés et seuls les tests unitaires tournent.

## 2. Tests automatisés — résultats

Dernière exécution : 04/11/2026 — **115 tests, 115 réussis, 0 échec** (~25 s).

### Conformité aux specs

| Contrôle | Résultat |
|----------|----------|
| Les 28 routes de l'API et celles de `specs/api` sont identiques (aucune manquante, aucune en trop, aucune décrite deux fois) | ✅ |
| Paramètres de requête et champs de corps identiques, route par route (50 vérifications) | ✅ |
| Chaque réponse obtenue par les tests d'intégration a un code documenté et un corps conforme au schéma de la spec, champs en trop refusés | ✅ |

### Unitaires

| Domaine | Cas couverts |
|---------|--------------|
| Cycle de vie des commandes | 6 transitions autorisées et 6 refusées côté producteur ; le client ne peut qu'annuler une commande non payée ; états terminaux ; remise en stock uniquement à l'annulation |
| Jetons | conversion des durées (`7d`, `12h`, `30m`, valeurs invalides) ; empreinte SHA-256 du refresh token |

### Intégration (API + PostGIS)

| Fonctionnalité | Cas vérifiés | Résultat |
|----------------|--------------|----------|
| Inscription | 201 avec jetons et sans hash ; email normalisé ; 400 sans consentement RGPD ; 409 email existant ; 400 mot de passe court avec le champ en détail | ✅ |
| Connexion / rôles | 200 / 401 ; route protégée 401 sans jeton ou jeton invalide ; 403 consommateur sur route producteur | ✅ |
| Sessions | refresh token à usage unique (rejeu refusé) ; déconnexion révoque ; changement de mot de passe révoque toutes les sessions | ✅ |
| Supervision | `/health` → `ok` / `database: up` | ✅ |
| Profil producteur | 404 avant création ; 201 puis 200 (upsert) ; position conservée ; horaires ; 403 pour un consommateur ; fiche publique sans compte, 400 / 404 sur identifiant invalide ou inconnu | ✅ |
| Recherche géolocalisée | producteur dans le rayon, trié par distance ; aucun résultat hors rayon ; 400 si `lat` sans `lon` ; catégories déduites des produits | ✅ |
| Catalogue | filtres catégorie et texte ; 403 modification par un autre producteur ; mise à jour ; produits masqués visibles dans « mon catalogue » mais pas en public ; suppression ; 400 catégorie inconnue / identifiant non UUID | ✅ |
| Commandes | total calculé côté serveur ; stock réservé ; 400 stock insuffisant sans décrément ; **8 commandes simultanées sur 5 unités → 5 acceptées, 3 refusées, stock 0** ; 400 produit d'un autre producteur ; 400 livraison sans adresse ; producteur ne peut pas commander | ✅ |
| Statuts | PENDING → PREPARING refusé (409) ; PAID → PREPARING → READY → COMPLETED ; annulation client avec remise en stock ; annulation refusée une fois payée ; tiers 403 | ✅ |
| Paiement Stripe | montant en centimes ; intent réutilisé ; webhook sans JWT ; signature invalide → 400 ; webhook valide → PAID ; intent étranger ignoré ; commande d'un autre → 403 ; Stripe non configuré → 503 | ✅ |
| Messagerie | envoi (contenu nettoyé) ; boîte de réception par interlocuteur ; compteur de non-lus ; lecture marque comme lu ; nom du producteur affiché ; message vide, à soi-même, destinataire inconnu refusés | ✅ |
| RGPD | export JSON complet sans hash (consommateur et producteur) ; suppression du compte : messages et sessions effacés, commandes anonymisées, accès refusé ensuite ; suppression d'un producteur : lignes de commande gardent le nom du produit | ✅ |
| Prévisions IA | réservées au producteur propriétaire (403 sinon) | ✅ |

Commande : `pnpm test` (avec `TEST_DATABASE_URL`). Détail : `apps/api/tests/`.

### Non couvert automatiquement

- Interfaces web et mobile (pas de tests de composants ni E2E) : couvertes par la recette manuelle.
- Assistant IA Gemini : dépend d'un service externe, vérifié manuellement avec une clé de test.
- Paiement réel Stripe de bout en bout : vérifié manuellement en mode test (§3).

## 3. Recette manuelle

Environnement : `docker compose -f docker-compose.dev.yml up -d`, `pnpm db:seed`, clés Stripe de
test et `stripe listen`. Comptes de démo : voir `docs/setup.md`.

### Parcours consommateur

- [ ] S'inscrire (case RGPD non cochée → refus, cochée → compte créé)
- [ ] Autoriser la géolocalisation, voir les producteurs dans un rayon de 30 km sur la carte
- [ ] Ouvrir une fiche producteur : présentation, horaires, catégories, produits
- [ ] Ajouter des produits de deux producteurs au panier (web et mobile)
- [ ] Valider : une commande par producteur, total identique au panier
- [ ] Payer avec `4242 4242 4242 4242` → statut « Payée » après le webhook
- [ ] Créer une commande puis l'annuler avant paiement → stock rendu
- [ ] Écrire au producteur ; le badge de non-lus apparaît chez lui
- [ ] Mon compte : modifier le profil, le mot de passe, télécharger ses données

### Parcours producteur

- [ ] S'inscrire comme producteur → invitation à créer la fiche
- [ ] Créer la fiche, « Localiser l'adresse » → position trouvée, présence sur la carte
- [ ] Ajouter 3 produits, en masquer un (invisible côté public)
- [ ] Recevoir une commande payée : la passer en préparation, prête, terminée
- [ ] Tableau de bord : chiffre du jour, commandes à préparer, stock faible, prévisions
- [ ] Répondre à un message

### Sécurité

- [ ] `/api/orders` sans jeton → 401 ; produit d'un autre producteur → 403
- [ ] Recherche contenant `' OR 1=1 --` → aucun effet (requêtes paramétrées)
- [ ] Base PostgreSQL injoignable depuis Internet (réseau Docker interne)
- [ ] HTTPS forcé sur `gateway.terraproxi.fr` et `app.terraproxi.fr`
- [ ] Session expirée : renouvelée automatiquement, puis retour à la connexion après déconnexion

### RGPD

- [ ] Pages « Confidentialité » et « Mentions légales » accessibles depuis le pied de page
- [ ] Export JSON contenant profil, commandes et messages
- [ ] Suppression du compte (web et mobile) → connexion impossible ensuite
- [ ] Aucune position de consommateur stockée en base

## 4. Critères d'acceptation

- CI verte sur `main` (specs, typage, tests, build, démarrage du conteneur).
- 100 % des tests automatisés réussis.
- Recette : tous les parcours consommateur et producteur validés ; aucune anomalie bloquante ouverte.
