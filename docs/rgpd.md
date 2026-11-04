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
| Assistant IA | Réponse aux questions | Message saisi, contexte du panier (sans nom ni email) envoyés à Google Gemini | Consentement (usage volontaire) | Non stocké par TerraProxi |

## Mesures techniques

- **Transport** : HTTPS (TLS) sur tous les échanges, HSTS via Caddy.
- **Mots de passe** : bcrypt (coût 12), jamais renvoyés par l'API.
- **Jetons** : accès JWT 15 min ; refresh token opaque 7 jours à usage unique, stocké sous forme d'empreinte.
- **Paiement** : saisie chez Stripe (PCI-DSS), le serveur ne voit jamais la carte.
- **Base de données** : réseau Docker interne, aucune exposition sur Internet ; requêtes paramétrées.
- **Hébergement** : OVHcloud, France (Union européenne).
- **Moindre privilège** : conteneurs API et web exécutés sans droits root.

## Droits des personnes

| Droit | Mise en œuvre | Endpoint |
|-------|---------------|----------|
| Information | Politique de confidentialité (`/privacy`), mentions légales (`/legal`) | — |
| Accès et portabilité | « Télécharger mes données » (web, page Mon compte) — export JSON | `GET /api/users/me/export` |
| Rectification | Profil, email, mot de passe (web) | `PATCH /api/users/profile`, `PUT /api/users/me/email`, `PUT /api/users/me/password` |
| Effacement | « Supprimer mon compte » (web et mobile) | `DELETE /api/users/me` |

**Effet de la suppression** (migration `002_rgpd_orders_producers.sql`) : compte, fiche producteur,
produits, messages et sessions sont supprimés ; les commandes restent pour la comptabilité mais
perdent le lien avec la personne (`consumer_id` / `producer_id` à NULL), les lignes gardent le
nom du produit. Ce comportement est vérifié par les tests d'intégration (`tests/integration/rgpd-messages.test.ts`).

## Consentement

- Case à cocher non pré-cochée à l'inscription (web et mobile) ; l'API refuse l'inscription sans elle (400).
- Date et heure enregistrées dans `users.gdpr_consent_at`.

## Contacts

- **Responsable du traitement** : équipe TerraProxi (Gaëtan FAUCHER, Théo FREIHUBER, Dunvael LE ROUX, Mylo WIEREZ)
- **Contact RGPD** : dpo@terraproxi.fr (adresse à créer)
- **Autorité de contrôle** : CNIL — <https://www.cnil.fr>
