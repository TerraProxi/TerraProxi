/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API, préfixe /api compris (ex. https://gateway.terraproxi.fr/api). */
  readonly VITE_API_URL?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
