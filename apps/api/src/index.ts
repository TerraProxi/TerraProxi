import './config/env'
import { createApp } from './app'
import { closeDb } from './db/client'
import { log } from './utils/logger'
import { startMaintenance, stopMaintenance } from './services/maintenance.service'

const PORT = Number(process.env.API_PORT ?? 3002)
/** Au-delà, Bun refuse la requête (les photos sont limitées à 5 Mo). */
const MAX_REQUEST_BODY_BYTES = 6 * 1024 * 1024

const app = createApp().listen({ port: PORT, maxRequestBodySize: MAX_REQUEST_BODY_BYTES })
startMaintenance()

log.info('api started', { port: PORT, swagger: `http://localhost:${PORT}/swagger` })

async function shutdown(signal: string) {
  log.info('api stopping', { signal })
  stopMaintenance()
  await app.stop()
  await closeDb()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
