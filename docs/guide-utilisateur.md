# TerraProxi — Guide utilisateur

## Pour les consommateurs

### S'inscrire et se connecter

1. Accéder à [app.terraproxi.fr](https://app.terraproxi.fr) ou télécharger l'app mobile.
2. Cliquer sur **S'inscrire** et choisir le rôle **Consommateur**.
3. Renseigner votre nom, email et mot de passe (8 caractères minimum).
4. **Accepter la politique de confidentialité** (obligatoire — RGPD).
5. Valider. Vous êtes automatiquement connecté.

### Trouver des producteurs

1. Onglet **Carte** — cliquer sur **Me localiser** pour afficher les producteurs autour de vous.
2. Ajuster le rayon (5 à 100 km) avec le curseur.
3. Cliquer sur un marqueur ou sur un producteur dans la liste pour accéder à sa fiche.

### Commander des produits

1. Sur la fiche d'un producteur, parcourir ses produits disponibles.
2. Cliquer **Ajouter au panier** sur un ou plusieurs produits.
   > Le panier peut regrouper plusieurs producteurs : une commande est créée par producteur.
3. Accéder au **Panier** (icône 🛒 dans le menu).
4. Vérifier les quantités, choisir le retrait chez le producteur (ou la livraison sur mobile), puis cliquer **Commander**.
5. Sur la page de **Paiement**, saisir vos informations de carte via Stripe.
6. Valider — vous recevrez une confirmation et la commande passera en statut **Payée**.

### Suivre ses commandes

- Onglet **Commandes** : liste de toutes vos commandes avec leur statut actuel.
- Statuts possibles : En attente → Payée → En préparation → Prête → Terminée.
- Une commande **Prête** signifie qu'elle est disponible pour le retrait chez le producteur.
- Tant qu'elle n'est pas payée, une commande peut être **annulée** depuis la liste : les produits sont remis en vente.

### Contacter un producteur

- Sur la fiche d'un producteur, cliquer **Contacter** (💬).
- Onglet **Messages** : historique de toutes vos conversations.

---

## Pour les producteurs

### Créer son espace producteur

1. S'inscrire en choisissant le rôle **Producteur**.
2. Le tableau de bord propose **Créer ma fiche producteur** (aussi accessible via **Mon profil**) :
   - nom de l'exploitation, présentation, horaires d'ouverture, site web, photo de couverture ;
   - adresse, code postal et ville, puis **📍 Localiser l'adresse** : la position est calculée automatiquement.
3. Enregistrer. Votre fiche apparaît sur la carte ; vous pouvez ensuite ajouter vos produits.

### Gérer son catalogue

- Onglet **Mon catalogue** → **+ Ajouter un produit**.
- Renseigner : nom, catégorie, prix (TTC), stock, unité de vente, description, photo (URL).
- Activer/désactiver la disponibilité sans supprimer le produit.
- Le stock est automatiquement décrémenté à chaque commande validée.

### Traiter les commandes

- Onglet **Commandes** : liste de toutes les commandes reçues, triables par statut.
- Lorsqu'une commande est **Payée**, cliquer **Passer en Préparation**.
- Une fois la commande préparée, cliquer **Prête** — le consommateur peut venir la récupérer.
- Après le retrait, cliquer **Terminée**.

### Tableau de bord

- Chiffre du jour (commandes payées), commandes à préparer, produits en stock faible.
- **Prévisions de la semaine prochaine** : quantités estimées d'après vos ventes des 8 dernières semaines, avec une alerte si le stock est insuffisant.

### Messagerie

- Répondre aux messages des consommateurs depuis l'onglet **Messages**.
- Les messages non lus apparaissent avec un badge sur l'icône.

---

## Données personnelles & RGPD

- Page **Mon compte** (web) : modifier vos informations, votre email et votre mot de passe.
- **Télécharger mes données** : export complet au format JSON (profil, commandes, messages).
- **Supprimer mon compte** (web : Mon compte ; mobile : Profil → Support) : vos messages et votre fiche sont effacés ; vos commandes passées sont conservées de façon anonyme pour la comptabilité.
- Vos données ne sont jamais vendues à des tiers.
- Hébergement exclusivement en France / Union Européenne (OVH).
- Politique de confidentialité et mentions légales : liens en bas de chaque page du site.
