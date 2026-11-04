import './config/env'
import { createApp } from './app'
import { closeDb } from './db/client'

const PORT = Number(process.env.API_PORT ?? 3002)

const app = createApp().listen(PORT)

console.log(`🌱 TerraProxi API démarrée sur http://localhost:${PORT}`)
console.log(`📖 Swagger UI : http://localhost:${PORT}/swagger`)

async function shutdown(signal: string) {
  console.log(`[API] ${signal} reçu — arrêt propre`)
  await app.stop()
  await closeDb()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
