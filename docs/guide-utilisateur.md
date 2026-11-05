# TerraProxi — Guide utilisateur

TerraProxi existe en site web ([app.terraproxi.fr](https://app.terraproxi.fr)) et en application
mobile. L'application mobile est réservée aux consommateurs ; les producteurs gèrent leur
boutique depuis le site, sur ordinateur, tablette ou téléphone.

## Pour les consommateurs

### S'inscrire et se connecter

1. Cliquer sur **S'inscrire** (sur le site, choisir le rôle **Consommateur**).
2. Renseigner votre nom, email et mot de passe (8 caractères minimum).
3. **Accepter la politique de confidentialité** (obligatoire — RGPD).
4. Cocher, si vous le souhaitez, **Recevoir les newsletters des producteurs** (facultatif, modifiable à tout moment).
5. Valider : vous êtes connecté.

Après 5 mots de passe erronés, la connexion est bloquée quelques minutes : le message indique le délai d'attente.

### Trouver des producteurs et des produits

- **Carte** : **Me localiser** affiche les producteurs autour de vous ; un clic sur un marqueur ouvre la fiche.
- **Produits** : recherche par nom, filtre par catégorie, et **Près de moi** pour les produits à moins de 30 km, avec la distance.
- **Fiche producteur** : présentation, adresse, horaires, site web, produits, badge **Producteur vérifié**
  et **Prochains rendez-vous** (marchés, portes ouvertes).
- **Agenda** : l'accueil (site) et l'onglet Boutiques (mobile) annoncent les marchés et événements près de vous.
- **Assistant** (🤖) : posez vos questions (« que cuisiner avec des courgettes ? ») ; il propose des produits
  locaux à ajouter au panier en un clic.

### Commander et payer

1. **Ajouter au panier** les produits voulus : le panier peut regrouper plusieurs producteurs et il est conservé
   si vous fermez la page.
2. Dans le **Panier**, pour chaque producteur : quantités, **retrait chez le producteur** ou **livraison**
   (adresse obligatoire), note facultative.
3. **Passer les commandes** : une commande est créée par producteur.
4. **Payer** chaque commande par carte via Stripe. La commande passe ensuite en **Payée**.

Une commande non payée au bout d'une heure est annulée automatiquement et ses produits sont remis en vente.

### Suivre ses commandes

- **Mes commandes** : liste et détail de chaque commande (produits, mode de remise, avancement).
- Statuts : En attente de paiement → Payée → En préparation → Prête → Terminée.
- Tant qu'elle n'est pas payée, une commande peut être **annulée**.
- Si le producteur annule une commande déjà payée, vous êtes **remboursé intégralement** et prévenu.

### Notifications

La cloche 🔔 indique le nombre de notifications non lues : paiement confirmé ou refusé, commande en
préparation, prête ou annulée, nouveau message, newsletter d'un producteur. Un clic ouvre la commande,
la conversation ou la fiche concernée. Sur mobile, autorisez les notifications pour les recevoir aussi
quand l'application est fermée.

### Contacter un producteur

- Sur la fiche d'un producteur, cliquer **Contacter** (💬).
- **Messages** : toutes vos conversations ; les nouveaux messages arrivent automatiquement.

---

## Pour les producteurs (site web)

### Créer son espace producteur

1. S'inscrire sur le site en choisissant le rôle **Producteur**.
2. **Mon profil** : nom de l'exploitation, présentation, horaires, site web, photo de couverture
   (envoyez une image depuis votre ordinateur), adresse puis **📍 Localiser l'adresse**.
3. Enregistrer : votre fiche apparaît sur la carte. Un administrateur peut ensuite la **vérifier**
   (badge « Producteur vérifié ») ; vous en êtes notifié.

### Gérer son catalogue

- **Mon catalogue** → **+ Ajouter un produit** : nom, catégorie, prix TTC, stock, unité, description,
  photo (envoi d'une image JPEG, PNG ou WebP de 5 Mo au maximum, ou lien).
- Activer ou désactiver un produit sans le supprimer. Le stock est réservé à chaque commande et remis en cas d'annulation.

### Traiter les commandes

- **Commandes** : les commandes payées arrivent avec une notification **Nouvelle commande à préparer**.
- Faire avancer chaque commande : **En préparation**, **Prête** (le client est prévenu), **Terminée**.
- **Annuler** une commande payée rembourse automatiquement le client.

### Tableau de bord et statistiques

- Chiffre du jour, commandes du jour, panier moyen, commandes à préparer, produits en stock bas.
- Courbe des ventes sur 7, 30 ou 90 jours et meilleures ventes.
- **Prévisions de la semaine prochaine** d'après vos ventes des 8 dernières semaines.

### Agenda

**Mon agenda** : ajoutez vos marchés, portes ouvertes ou ventes à la ferme (date, horaires, lieu,
description). Ils apparaissent sur votre fiche et dans l'agenda de proximité des consommateurs.

### Newsletter

1. **Newsletter** → **Rédiger avec l'IA** : choisissez un ton et un sujet ; un brouillon est rédigé à partir
   de vos produits disponibles et de votre agenda.
2. Relisez et modifiez l'objet et le texte, puis **Envoyer**.
3. Elle part en notification aux clients ayant déjà payé une commande chez vous et ayant accepté les
   newsletters. Une newsletter par 24 heures au maximum.

### Messagerie

- Répondre aux consommateurs depuis **Messages** ; les non-lus apparaissent avec un badge.

---

## Pour les administrateurs

L'espace **Administration** (site web, compte ADMIN uniquement) permet de :
- suivre les indicateurs de la plateforme (comptes, producteurs à vérifier, commandes payées, chiffre d'affaires) ;
- rechercher un compte et le **suspendre** ou le **réactiver** (l'accès est coupé immédiatement) ;
- **vérifier** les producteurs en attente.

---

## Données personnelles & RGPD

- **Mon compte** (site et mobile) : modifier vos informations, votre email, votre mot de passe et votre
  consentement aux newsletters.
- **Télécharger mes données** : export complet au format JSON (profil, commandes, messages, notifications, agenda, photos).
- **Supprimer mon compte** : vos messages, notifications, photos et votre fiche sont effacés ; vos commandes
  passées sont conservées de façon anonyme pour la comptabilité. Les commandes non payées sont annulées ;
  un producteur doit d'abord remettre ou annuler ses commandes payées.
- Vos données ne sont jamais vendues à des tiers. Hébergement en France (OVH, Union européenne).
- Politique de confidentialité et mentions légales : liens en bas de chaque page du site.
