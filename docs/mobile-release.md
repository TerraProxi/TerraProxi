# TerraProxi — Publication de l'application mobile

Application Expo SDK 51 (React Native 0.74), dossier `apps/mobile`. Les builds natifs passent par
**EAS Build** (service Expo) : aucun Android Studio ni Xcode n'est nécessaire en local.

## 1. Prérequis (une seule fois)

1. Un compte Expo (https://expo.dev) ayant accès à l'organisation qui publiera l'application.
2. La CLI EAS : `npm install -g eas-cli`, puis `eas login`.
3. Initialiser le projet EAS depuis `apps/mobile` :
   ```bash
   cd apps/mobile
   eas init
   ```
   La configuration étant dynamique (`app.config.ts`), `eas init` ne peut pas l'écrire lui-même :
   il affiche l'identifiant du projet. Le déclarer dans `EAS_PROJECT_ID` (fichier `apps/mobile/.env`
   pour les commandes locales, et variable d'environnement EAS — voir §2).
4. Créer une clé Google **Maps SDK for Android** (Google Cloud Console → API et services), restreinte
   au package `fr.terraproxi.app` et à l'empreinte SHA-1 du certificat de signature
   (`eas credentials` → Android → affiche l'empreinte). Sans cette clé, la carte reste vide
   dans un build Android.

## 2. Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `eas.json` (par profil) | URL de l'API, `/api` compris |
| `EXPO_PUBLIC_STRIPE_KEY` | variable EAS | Clé publique Stripe (`pk_test_…` / `pk_live_…`). Vide : le paiement est indiqué comme indisponible |
| `EXPO_PUBLIC_WEB_URL` | variable EAS | Site web (pages légales, back-office producteur) |
| `GOOGLE_MAPS_ANDROID_API_KEY` | variable EAS (secrète) | Lue par `app.config.ts` → `android.config.googleMaps.apiKey` |
| `EAS_PROJECT_ID` | variable EAS + `.env` local | Lue par `app.config.ts` → `extra.eas.projectId` |

Déclaration côté EAS (une fois par environnement) :

```bash
eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value "<clé>" --environment preview --environment production --visibility secret
eas env:create --name EXPO_PUBLIC_STRIPE_KEY --value "pk_test_…" --environment preview --visibility plaintext
eas env:create --name EAS_PROJECT_ID --value "<id>" --environment preview --environment production --visibility plaintext
```

Les variables `EXPO_PUBLIC_*` sont **embarquées dans le JavaScript** : n'y mettre que des valeurs publiques.

## 3. APK Android de test (profil `preview`)

```bash
cd apps/mobile
eas build -p android --profile preview
```

Le build produit un **APK** installable directement (lien et QR code en fin de build). Il cible
l'API de production (`eas.json`) ; changer `EXPO_PUBLIC_API_URL` du profil pour viser un autre serveur.

Pour développer avec le paiement Stripe natif (absent d'Expo Go) : `eas build -p android --profile development`,
puis `pnpm dev:mobile` et ouvrir le projet depuis le *development build*.

## 4. Version de production

```bash
eas build -p android --profile production   # AAB pour Google Play (numéro de version incrémenté par EAS)
eas submit -p android --profile production  # piste « internal » de Google Play
```

`eas submit` lit la clé du compte de service Google Play dans `apps/mobile/google-play-service-account.json`
(ignorée par git ; à télécharger depuis la Google Play Console → Accès à l'API). Le premier envoi
d'une application doit être fait à la main dans la Play Console.

## 5. iOS

- Nécessite un compte Apple Developer payant ; `eas build -p ios --profile preview` demande les
  identifiants Apple et gère certificats et profils de provisionnement.
- L'installation d'un build `preview` sur iPhone exige d'enregistrer l'appareil (`eas device:create`).
- Pour l'App Store : `eas build -p ios --profile production` puis `eas submit -p ios` (EAS demande
  l'identifiant App Store Connect de l'application à la première soumission).
- Apple Pay n'est pas activé : le `merchantIdentifier` déclaré pour Stripe ne sert que si on l'active.
- Sur iOS, la carte utilise Apple Plans : aucune clé Google n'est nécessaire.

## 6. Notifications push (NOTIF-4)

- Après la connexion, l'application demande l'autorisation, récupère le jeton Expo Push
  (`getExpoPushTokenAsync({ projectId })`) et l'envoie à `PUT /users/me/push-token`. À la
  déconnexion, elle envoie `{ "token": null }` avant de révoquer la session. Une autorisation
  refusée retire aussi le jeton.
- Le jeton exige l'**identifiant du projet EAS** : sans `EAS_PROJECT_ID` (donc sans
  `extra.eas.projectId`), l'enregistrement est simplement ignoré ; les notifications in-app
  (cloche, `GET /notifications`) fonctionnent quand même.
- Les push ne fonctionnent que dans un **build EAS** (`development`, `preview` ou `production`) sur
  un vrai téléphone : ni Expo Go, ni les émulateurs sans services Google, ni le simulateur iOS.
- Android : envoi via FCM. Déclarer les identifiants FCM du projet Firebase dans EAS
  (`eas credentials` → Android → Push Notifications : clé de compte de service FCM v1). Le canal
  Android `default` (« Notifications TerraProxi ») est créé par l'application.
- iOS : `eas build` propose de créer la clé APNs ; l'accepter.
- Appuyer sur une notification ouvre sa cible (`data.target_type` / `data.target_id`) : commandes,
  conversation ou fiche producteur, y compris quand l'application était fermée.

## 7. Vérifications avant publication

```bash
pnpm --filter @terraproxi/mobile typecheck
cd apps/mobile && npx expo-doctor          # versions des dépendances alignées sur le SDK
npx expo export --platform android --output-dir /tmp/terraproxi-export   # le bundle JavaScript se construit
```
