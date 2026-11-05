import { db } from '../db/client'
import { log } from '../utils/logger'
import { pruneRateLimits } from '../utils/rate-limit'
import { expireStaleOrders } from './order-lifecycle.service'

/**
 * Tâches périodiques de l'API (une seule instance en production) :
 * expiration des commandes jamais payées, purge des sessions expirées,
 * nettoyage des compteurs anti-abus.
 */
const INTERVAL_MS = Number(process.env.MAINTENANCE_INTERVAL_MS ?? 5 * 60_000)

let timer: ReturnType<typeof setInterval> | null = null

export async function runMaintenance(): Promise<void> {
  try {
    const expired = await expireStaleOrders()
    const purged = await db.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()')
    pruneRateLimits()
    if (expired || purged.rowCount) {
      log.info('maintenance', { expired_orders: expired, purged_refresh_tokens: purged.rowCount })
    }
  } catch (err) {
    log.error('maintenance failed', { err })
  }
}

export function startMaintenance(): void {
  if (timer || process.env.MAINTENANCE_DISABLED === 'true') return
  timer = setInterval(() => void runMaintenance(), INTERVAL_MS)
  void runMaintenance()
}

export function stopMaintenance(): void {
  if (timer) clearInterval(timer)
  timer = null
}
