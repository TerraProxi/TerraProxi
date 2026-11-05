import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/** Tests web : jsdom, aucun appel réseau (les services ou axios sont simulés dans chaque test). */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    // Les feuilles de style sont ignorées en test, sauf les jetons de couleur lus par contrast.test.ts
    css: { include: [/variables\.css/] },
    // Heure de Paris, comme les données de l'API : les conversions datetime-local restent déterministes
    env: { TZ: 'Europe/Paris' },
  },
})
