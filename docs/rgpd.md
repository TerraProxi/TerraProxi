# TerraProxi — Conformité RGPD

## Registre des traitements

| Traitement | Finalité | Données | Base légale | Conservation |
|-----------|----------|---------|-------------|--------------|
| Compte | Identification | Nom, email, téléphone (facultatif), mot de passe haché, rôle, date du consentement | Consentement explicite | Jusqu'à la suppression du compte |
| Fiche producteur | Mise en relation | Raison sociale, adresse et position de l'exploitation, horaires, site web | Exécution du contrat | Jusqu'à la suppression du compte |
| Commandes | Vente | Produits, montants, statut, mode de retrait, adresse de livraison éventuelle | Exécution du contrat ; obligation légale | 10 ans (pièces comptables), **anonymisées** à la suppression du compte |
| Paiements | Règlement | Référence de transaction Stripe uniquement (jamais la carte) | Exécution du contrat | Avec la commande |
| Messages | Échanges client / producteur | Contenu, date | Intérêt légitime (service) | Supprimés avec l'un ou l'autre compte |
| Sessions | Sécurité | Empreinte SHA-256 des refresh tokens, date d'expiration | Intérêt légitime (sécurité) | 7 jours ; supprimées à la déconnexion, au changement de mot de passe et avec le compte |
| Localisation du consommateur | Recherche à proximité | Coordonnées GPS envoyées dans la requête | Consentement (navigateur / OS) | **Non stockées** |
| Notifications | Suivi des commandes et des messages | Titre, texte, lien vers la commande ou la conversation ; jeton Expo Push de l'appareil (mobile) | Exécution du contrat ; push : consentement (permission du téléphone) | Supprimées avec le compte ; jeton retiré à la déconnexion |
| Newsletters | Information commerciale des producteurs | Objet, texte ; envoi aux seuls clients ayant payé une commande chez le producteur | **Consentement** (`newsletter_opt_in`, faux par défaut, retirable dans le profil) | Supprimées avec le compte du producteur |
| Photos | Illustration des produits et profils | Fichiers image envoyés (JPEG, PNG, WebP) | Exécution du contrat | **Effacées du disque** avec le compte |
| Journaux techniques | Sécurité, diagnostic | Méthode, chemin, statut, durée, identifiant de requête ; IP comptée en mémoire pour la limitation anti-abus | Intérêt légitime (sécurité) | Rotation Docker ; compteurs effacés après 15 min à 1 h |
| Assistant IA | Réponse aux questions | Message saisi, contexte du panier (sans nom ni email) envoyés à Google Gemini | Consentement (usage volontaire) | Non stocké par TerraProxi |

## Mesures techniques

- **Transport** : HTTPS (TLS) sur tous les échanges, HSTS via Caddy.
- **Mots de passe** : bcrypt (coût 12), jamais renvoyés par l'API.
- **Jetons** : accès JWT 15 min ; refresh token opaque 7 jours à usage unique, stocké sous forme d'empreinte.
- **Paiement** : saisie chez Stripe (PCI-DSS), le serveur ne voit jamais la carte.
- **Base de données** : réseau Docker interne, aucune exposition sur Internet ; requêtes paramétrées.
- **Hébergement** : OVHcloud, France (Union européenne).
- **Moindre privilège** : conteneurs API et web exécutés sans droits root.
- **Anti-abus** : limitation des tentatives de connexion (force brute), des inscriptions et des
  appels IA ; un compte suspendu ou supprimé perd l'accès immédiatement.
- **Journaux** : aucun mot de passe, jeton ni contenu de message n'est journalisé.

## Droits des personnes

| Droit | Mise en œuvre | Endpoint |
|-------|---------------|----------|
| Information | Politique de confidentialité (`/privacy`), mentions légales (`/legal`) | — |
| Accès et portabilité | « Télécharger mes données » (web, page Mon compte) — export JSON | `GET /api/users/me/export` |
| Opposition | Retirer le consentement aux newsletters (profil), refuser les notifications push (téléphone) | `PATCH /api/users/profile`, `PUT /api/users/me/push-token` |
| Rectification | Profil, email, mot de passe (web et mobile) | `PATCH /api/users/profile`, `PUT /api/users/me/email`, `PUT /api/users/me/password` |
| Effacement | « Supprimer mon compte » (web et mobile) | `DELETE /api/users/me` |

**Effet de la suppression** (migrations `002` et `003`, ADR 0003 et 0006) : compte, fiche producteur,
produits, agenda, newsletters, messages, notifications, photos (fichiers compris) et sessions sont
supprimés ; les commandes restent pour la comptabilité mais perdent le lien avec la personne
(`consumer_id` / `producer_id` à NULL), les lignes gardent le nom du produit. Les commandes non
payées sont annulées ; un producteur ayant des commandes payées non remises doit d'abord les
solder (409). L'export couvre aussi notifications, agenda, newsletters et photos. Vérifié par
`tests/integration/rgpd-messages.test.ts` et `admin-security.test.ts`.

## Consentement

- Case à cocher non pré-cochée à l'inscription (web et mobile) ; l'API refuse l'inscription sans elle (400).
- Date et heure enregistrées dans `users.gdpr_consent_at`.
- Newsletters : case distincte et facultative, non pré-cochée (`newsletter_opt_in`), modifiable à tout moment.

## Contacts

- **Responsable du traitement** : équipe TerraProxi (Gaëtan FAUCHER, Théo FREIHUBER, Dunvael LE ROUX, Mylo WIEREZ)
- **Contact RGPD** : dpo@terraproxi.fr (adresse à créer)
- **Autorité de contrôle** : CNIL — <https://www.cnil.fr>
