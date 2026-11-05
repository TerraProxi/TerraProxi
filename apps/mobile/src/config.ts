/** Site web : pages légales et back-office des producteurs. */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '') || 'https://app.terraproxi.fr'

/** Clé publique Stripe ; vide quand le paiement n'est pas configuré pour ce build. */
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY?.trim() ?? ''
