import type { ExpoConfig } from 'expo/config'

/**
 * Configuration Expo dynamique : les valeurs propres à chaque environnement viennent
 * de variables d'environnement (voir apps/mobile/.env.example et docs/mobile-release.md).
 *
 * - GOOGLE_MAPS_ANDROID_API_KEY : clé « Maps SDK for Android » (sans elle, la carte reste
 *   vide dans un build Android ; Expo Go fournit sa propre clé en développement).
 * - EAS_PROJECT_ID : identifiant renvoyé par `eas init`.
 */
const BRAND_GREEN = '#5BAE6A'

const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY
const easProjectId = process.env.EAS_PROJECT_ID

const config: ExpoConfig = {
  name: 'TerraProxi',
  slug: 'terraproxi',
  scheme: 'terraproxi',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: BRAND_GREEN,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'fr.terraproxi.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'TerraProxi utilise votre localisation pour trouver les producteurs près de chez vous.',
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
        NSExceptionDomains: {
          localhost: { NSExceptionAllowsInsecureHTTPLoads: true },
        },
      },
    },
  },
  android: {
    package: 'fr.terraproxi.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: BRAND_GREEN,
    },
    ...(googleMapsApiKey ? { config: { googleMaps: { apiKey: googleMapsApiKey } } } : {}),
  },
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
  plugins: [
    'expo-location',
    'expo-secure-store',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: BRAND_GREEN }],
    ['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.fr.terraproxi' }],
  ],
}

export default config
