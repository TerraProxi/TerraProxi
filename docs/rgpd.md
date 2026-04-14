# TerraProxi — Conformité RGPD

## Registre des traitements

| Traitement | Finalité | Données collectées | Base légale | Durée de conservation |
|-----------|----------|-------------------|-------------|----------------------|
| Inscription | Création de compte | Nom, email, mot de passe (hashé), rôle, consentement RGPD | Consentement explicite | Jusqu'à suppression du compte |
| Commandes | Transaction commerciale | Identité acheteur, produits achetés, montant, statut | Exécution du contrat | 5 ans (obligations comptables) |
| Paiements | Règlement en ligne | Référence transaction Stripe (jamais les données de carte) | Exécution du contrat | 5 ans |
| Messages | Communication | Contenu des messages, horodatage | Intérêt légitime (service) | Jusqu'à suppression du compte |
| Localisation | Recherche géographique | Coordonnées GPS (uniquement pendant la session, non stockées) | Consentement (navigateur/OS) | Non stocké |

## Mesures techniques

- **Chiffrement en transit** : HTTPS (TLS 1.3) sur tous les échanges.
- **Mots de passe** : Jamais stockés en clair — hashés avec bcrypt (coût 12).
- **Tokens JWT** : Durée de vie limitée (15 min access, 7 jours refresh).
- **Données de paiement** : Jamais stockées sur nos serveurs. Stripe est PCI-DSS certifié.
- **Base de données** : Inaccessible depuis Internet, uniquement via le réseau Docker interne.
- **Hébergement** : OVH (France) — données dans l'Union Européenne.

## Droits des utilisateurs

Tout utilisateur peut :
- **Accéder** à ses données : endpoint `GET /api/users/profile`
- **Rectifier** ses données : endpoint `PATCH /api/users/profile`
- **Supprimer** son compte et toutes ses données : endpoint `DELETE /api/users/me`
  - Déclenche une suppression en cascade de toutes les données associées (CASCADE en base de données).

## Consentement

- Le consentement est collecté **explicitement** lors de l'inscription via une case à cocher non pré-cochée.
- La date et l'heure du consentement sont enregistrées dans la colonne `gdpr_consent_at` de la table `users`.
- L'inscription est **refusée** si le consentement n'est pas fourni.

## Contacts

- **Responsable du traitement** : TerraProxi (FAUCHER Gaëtan, FREIHUBER Théo, LE ROUX Dunvael, WIEREZ Mylo)
- **Contact RGPD** : dpo@terraproxi.fr (à créer)
- **Autorité de contrôle** : CNIL (France) — [cnil.fr](https://www.cnil.fr)
