import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const DEFAULT_API_PORT = '3002'

export default defineConfig(({ mode }) => {
  // Le proxy de dev suit le port de l'API défini dans le .env racine (API_PORT)
  const rootEnv = loadEnv(mode, REPO_ROOT, '')
  const apiTarget = `http://localhost:${rootEnv.API_PORT || DEFAULT_API_PORT}`

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/health': { target: apiTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
