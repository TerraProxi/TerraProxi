/**
 * Variables publiques Expo (SDK ≥ 49) : seules celles préfixées EXPO_PUBLIC_
 * sont injectées dans le bundle au build. Voir apps/mobile/.env.example.
 */
declare const process: {
  env: {
    /** URL de l'API, /api compris (ex. http://192.168.1.20:3002/api pour un téléphone sur le Wi-Fi). */
    EXPO_PUBLIC_API_URL?: string
    EXPO_PUBLIC_STRIPE_KEY?: string
    /** URL du site web, pour ouvrir les pages légales. */
    EXPO_PUBLIC_WEB_URL?: string
  }
}
