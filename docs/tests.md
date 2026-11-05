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
| Web (logique et composants) | Vitest + Testing Library + jsdom | `apps/web/src/**/*.test.ts(x)` | `pnpm test:web` (enchaîné par `pnpm test`), CI |
| Déploiement | build des images + démarrage du conteneur API | `.github/workflows/ci.yml` | CI |
| Recette | parcours manuels ci-dessous | web, mobile | avant chaque soutenance / mise en production |

Les tests d'intégration appellent l'application Elysia en mémoire (`app.handle`) contre une vraie
base : ils exercent les requêtes SQL, les contraintes et les transactions. Stripe est remplacé
par un faux client à la frontière du contrat (aucun appel réseau). La base de test
(`TEST_DATABASE_URL`) est vidée avant chaque test ; sans cette variable les tests d'intégration
sont ignorés et seuls les tests unitaires tournent.

## 2. Tests automatisés — résultats

Dernière exécution : 05/11/2026 — **184 tests API, 184 réussis, 0 échec** (~90 s sous Windows).

### Conformité aux specs

| Contrôle | Résultat |
|----------|----------|
| Les 56 routes de l'API et celles de `specs/api` sont identiques (aucune manquante, aucune en trop, aucune décrite deux fois) | ✅ |
| Paramètres de requête et champs de corps identiques, route par route | ✅ |
| Chaque réponse obtenue par les tests d'intégration a un code documenté et un corps conforme au schéma de la spec, champs en trop refusés | ✅ |

### Unitaires

| Domaine | Cas couverts |
|---------|--------------|
| Cycle de vie des commandes | 6 transitions autorisées et 6 refusées côté producteur ; le client ne peut qu'annuler une commande non payée ; états terminaux ; remise en stock uniquement à l'annulation |
| Jetons | conversion des durées (`7d`, `12h`, `30m`, valeurs invalides) ; empreinte SHA-256 du refresh token |
| Sécurité | limiteur (blocage, `Retry-After`, fenêtre, clés indépendantes) ; `JWT_SECRET` faible refusé en production ; URL `javascript:` / `data:` refusées ; type d'image déduit des octets |

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
| Paiement : annulation et remboursement | double clic → un seul PaymentIntent ; annulation pendant le paiement → intent annulé, stock remis ; paiement déjà validé → 409 ; paiement reçu après annulation → remboursé une seule fois ; annulation producteur d'une commande payée → remboursement ; Stripe muet → 502 sans modification ; paiement refusé → client prévenu | ✅ |
| Expiration | commande non payée depuis plus d'une heure annulée, stock libéré, client notifié ; commande récente intacte | ✅ |
| Notifications | commande payée → producteur et client notifiés, push envoyé ; préparation et commande prête ; message sans rafale, lu avec la conversation ; lecture une par une / toutes ; 404 sur celle d'un autre ; jeton push validé et unique par appareil | ✅ |
| Agenda | publication, agenda public par producteur et par zone ; passés masqués ; dates incohérentes 400 ; propriétaire seul (403) | ✅ |
| Statistiques | chiffre du jour, panier moyen, commandes à préparer, courbe complète, top produits, stock bas ; commandes non payées exclues ; 403 consommateur | ✅ |
| Newsletter | destinataires = clients abonnés ayant payé ; une par 24 h (429) ; brouillon IA : 503 sans clé, clé en en-tête, 403 consommateur | ✅ |
| Administration | 401 / 403 hors ADMIN ; indicateurs ; recherche ; suspension immédiate (jeton, refresh, connexion) puis réactivation ; pas d'auto-suspension ; vérification d'un producteur notifiée | ✅ |
| Sécurité | 429 après 5 échecs de connexion, même avec le bon mot de passe ; compteur remis à zéro ; URL piégées 400 ; deux clients ne peuvent pas s'écrire ; `/health` détaillé | ✅ |
| Photos | PNG accepté et téléchargeable ; script déguisé 400 ; plus de 5 Mo 413 ; sans compte 401 ; fichiers effacés avec le compte | ✅ |
| Droit à l'oubli et commandes | producteur avec commande payée 409 puis OK une fois remise ; commandes non payées annulées et stock remis | ✅ |

Commande : `pnpm test` (avec `TEST_DATABASE_URL`). Détail : `apps/api/tests/`.

### Tests web

Dernière exécution : 05/11/2026 — **41 cas web (8 fichiers), 41 réussis, 0 échec**.
Vitest 2.1 + Testing Library dans jsdom, sans réseau : les services ou l'authentification sont
simulés (`vi.mock`), aucun snapshot. Configuration : `apps/web/vitest.config.ts` (heure de Paris).

| Domaine | Cas couverts | Fichier |
|---------|--------------|---------|
| Panier | quantités cumulées et bornées 1–999 ; regroupement multi-producteurs, sous-totaux et total ; retrait d'un producteur ; persistance `localStorage` et restauration ; contenu stocké corrompu ignoré ; `localStorage` qui lève une exception → panier en mémoire | `contexts/CartContext.test.tsx` |
| Notifications | cible ouverte au clic selon le type et le rôle (commande client / producteur, conversation, fiche producteur) ; aucune cible | `services/notifications.service.test.ts` |
| Erreurs d'API | message de l'API + délai `Retry-After` d'un 429 (minutes, secondes, valeur invalide) ; serveur injoignable, délai dépassé, repli | `services/api.test.ts` |
| Formatage et agenda | prix en euros ; `datetime-local` ↔ ISO UTC (été, hiver, aller-retour) ; période d'un rendez-vous sur un ou plusieurs jours | `utils/format.test.ts` |
| Envoi de photo | formats et taille 5 Mo ; envoi réussi → URL transmise ; fichier trop lourd non envoyé et annoncé ; refus 413 du serveur traduit | `components/ui/ImageUpload.test.tsx` |
| Gardes de route | visiteur → connexion avec la page demandée ; page ouverte aux anonymes ; producteur, admin et consommateur renvoyés vers leur espace ; rôle correct accepté | `components/layout/RequireAuth.test.tsx` |
| Connexion | champs reliés à leurs labels ; erreur 429 annoncée en `role="alert"` avec le délai ; retour à la page demandée ou au tableau de bord producteur | `pages/auth/LoginPage.test.tsx` |
| Accessibilité des couleurs | contraste ≥ 4,5:1 des jetons de texte (`*-strong`, texte atténué, gris foncé) sur blanc et fond clair, calculé depuis `variables.css` ; teintes de la charte réservées au décor | `styles/contrast.test.ts` |

Commande : `pnpm test:web` (ou `npx -y pnpm@9.15.9 --filter @terraproxi/web test`).

### Tests mobile

Dernière exécution : 05/11/2026 — **20 tests, 20 réussis, 0 échec** (7 fichiers, ~35 s sous Windows).
Jest 29 avec le preset `jest-expo` 51 ; tests de logique uniquement (aucun snapshot).
SecureStore, AsyncStorage (mock officiel), expo-notifications et expo-constants sont simulés ;
le réseau est remplacé par un faux adaptateur axios (`apps/mobile/src/test/http.ts`).

| Domaine | Cas couverts |
|---------|--------------|
| Panier | quantités cumulées pour un même produit ; regroupement par producteur ; quantité minimale 1 et producteur retiré quand il n'a plus d'article ; après un échec partiel, seuls les articles du producteur refusé restent, avec le message de l'API |
| Persistance | panier écrit dans AsyncStorage puis restauré avec ses totaux au relancement |
| Favoris | favori supprimé côté serveur (404) oublié, les autres affichés ; autres erreurs remontées sans rien oublier |
| Session (API) | un 401 → un seul refresh puis requête rejouée avec le nouveau jeton ; trois requêtes refusées en même temps → un seul refresh ; refresh refusé → jetons effacés, store déconnecté, alerte « Session expirée » |
| Notifications | ORDER → commandes, CONVERSATION → conversation avec `target_id`, PRODUCER → fiche producteur ; notification sans cible ignorée ; cible mise de côté pendant le démarrage puis ouverte |
| Push | sans projectId EAS, aucun appel ; permission refusée → `{ token: null }` ; permission accordée → jeton Expo envoyé |
| Carte | rayon calculé sur la zone visible et plafonné à 500 km |
| Catalogue | libellé français pour chacune des 8 catégories de la spec, aucun code brut |
| Erreurs | 429 → titre « Trop de tentatives » et message de l'API ; autres erreurs → titre habituel |

Commande : `pnpm test:mobile` (aucune base ni serveur nécessaires). Détail : `apps/mobile/src/**/*.test.ts`.

### Non couvert automatiquement

- Parcours complets dans un vrai navigateur ou sur un téléphone (E2E) : couverts par la recette manuelle ;
  la logique web et mobile est testée (voir « Tests web » et « Tests mobile »).
- Assistant IA Gemini : dépend d'un service externe, vérifié manuellement avec une clé de test
  (la newsletter IA est testée avec un faux transport Gemini).
- Push mobile réel (Expo) : nécessite un téléphone et un build EAS ; l'envoi est testé avec un faux émetteur.
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
