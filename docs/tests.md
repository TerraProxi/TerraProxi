# TerraProxi — Plan de tests

## Tests automatisés (API — Bun Test)

Créer les fichiers `*.test.ts` dans `apps/api/src/` et lancer via `bun test`.

### Auth

| Cas | Résultat attendu |
|-----|-----------------|
| Inscription avec données valides + consentement | 201, retourne user + token |
| Inscription sans consentement RGPD | 400, erreur explicite |
| Inscription email déjà utilisé | 409 |
| Connexion avec bon email/mot de passe | 200, token valide |
| Connexion avec mauvais mot de passe | 401 |
| Accès à `/api/auth/me` sans token | 401 |

### Producteurs & Géolocalisation

| Cas | Résultat attendu |
|-----|-----------------|
| `GET /api/producers?lat=43.6&lon=3.9&radius=20` | Liste ordonnée par distance |
| Producteur sans localisation n'apparaît pas dans la recherche géo | Filtré |
| Créer un profil producteur (rôle PRODUCER) | 201 |
| Créer un profil producteur avec un compte CONSUMER | 403 |

### Produits

| Cas | Résultat attendu |
|-----|-----------------|
| `POST /api/products` avec rôle PRODUCER | 201, produit créé |
| `DELETE /api/products/:id` par un autre producteur | 403 |
| Modifier le stock d'un produit | Stock mis à jour |

### Commandes

| Cas | Résultat attendu |
|-----|-----------------|
| Créer une commande avec produits en stock | 201, stock décrémenté |
| Créer une commande avec stock insuffisant | 400 |
| Créer une commande pour un produit d'un autre producteur | 400 |
| Voir les commandes d'un autre consommateur | 403 |

### Stripe (mode test)

| Cas | Résultat attendu |
|-----|-----------------|
| Créer un PaymentIntent pour une commande PENDING | 200, client_secret retourné |
| Créer un PaymentIntent pour une commande déjà PAID | 400 |
| Webhook avec signature invalide | 400 |
| Webhook `payment_intent.succeeded` valide | Commande passe en PAID |

---

## Plan de tests manuels (recette)

### Parcours consommateur complet

- [ ] S'inscrire en tant que consommateur
- [ ] Se localiser sur la carte
- [ ] Trouver un producteur dans un rayon de 30 km
- [ ] Consulter sa fiche et ses produits
- [ ] Ajouter 2 produits au panier
- [ ] Valider la commande
- [ ] Payer avec la carte test Stripe `4242 4242 4242 4242`
- [ ] Vérifier que le statut passe en PAID
- [ ] Contacter le producteur par message

### Parcours producteur complet

- [ ] S'inscrire en tant que producteur
- [ ] Créer son profil avec localisation
- [ ] Ajouter 3 produits au catalogue
- [ ] Voir les commandes reçues dans le tableau de bord
- [ ] Passer une commande en PREPARING puis READY
- [ ] Répondre à un message d'un consommateur

### Tests de sécurité

- [ ] Tenter d'accéder à `/api/orders` sans token → 401
- [ ] Tenter de modifier le produit d'un autre producteur → 403
- [ ] Injection SQL dans un champ de recherche → Requête paramétrisée, pas d'erreur DB
- [ ] Accéder à la base PostgreSQL depuis l'extérieur → Impossible (réseau interne)
- [ ] Vérifier HTTPS forcé sur `gateway.terraproxi.fr` → Redirection automatique

### Tests RGPD

- [ ] S'inscrire sans cocher la case RGPD → Refus
- [ ] Supprimer son compte → Toutes les données effacées en cascade
- [ ] Vérifier que les données GPS ne sont pas stockées en base
