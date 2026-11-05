import { AppError } from './errors'

/**
 * Limiteur de débit en mémoire (fenêtre fixe par clé).
 *
 * Suffisant pour une instance unique de l'API derrière Caddy. Avec plusieurs
 * instances, il faudrait partager les compteurs (Redis, table PostgreSQL).
 */
interface Bucket {
  count: number
  resetAt: number
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfterSeconds: number, message: string) {
    super(429, message)
    this.name = 'RateLimitError'
  }
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
    private readonly message: string,
  ) {}

  /** Compte une occurrence ; lève RateLimitError (429) au-delà du maximum. */
  hit(key: string, now = Date.now()): void {
    const bucket = this.current(key, now)
    bucket.count += 1
    if (bucket.count > this.maxHits) {
      throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000), this.message)
    }
  }

  /** Lève RateLimitError si la clé a déjà atteint le maximum, sans compter d'occurrence. */
  assertAllowed(key: string, now = Date.now()): void {
    const bucket = this.current(key, now)
    if (bucket.count >= this.maxHits) {
      throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000), this.message)
    }
  }

  reset(key: string): void {
    this.buckets.delete(key)
  }

  clear(): void {
    this.buckets.clear()
  }

  /** Supprime les fenêtres expirées (appelé par la tâche de maintenance). */
  prune(now = Date.now()): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
  }

  private current(key: string, now: number): Bucket {
    const existing = this.buckets.get(key)
    if (existing && existing.resetAt > now) return existing
    const fresh = { count: 0, resetAt: now + this.windowMs }
    this.buckets.set(key, fresh)
    return fresh
  }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const limit = (name: string, fallback: number) => Number(process.env[name] ?? fallback)

/** Limiteurs de l'API (seuils surchargeables par variables d'environnement). */
export const rateLimits = {
  /** Échecs de connexion par couple IP + email (protection contre la force brute). */
  loginFailuresPerAccount: new RateLimiter(
    limit('RATE_LIMIT_LOGIN_PER_ACCOUNT', 5), 15 * MINUTE,
    'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
  ),
  /** Échecs de connexion par IP, tous emails confondus (bourrage d'identifiants). */
  loginFailuresPerIp: new RateLimiter(
    limit('RATE_LIMIT_LOGIN_PER_IP', 30), 15 * MINUTE,
    'Trop de tentatives de connexion depuis cette adresse. Réessayez plus tard.',
  ),
  registrationsPerIp: new RateLimiter(
    limit('RATE_LIMIT_REGISTER_PER_IP', 10), HOUR,
    'Trop d\'inscriptions depuis cette adresse. Réessayez plus tard.',
  ),
  aiRequestsPerUser: new RateLimiter(
    limit('RATE_LIMIT_AI_PER_USER', 30), HOUR,
    'Quota de l\'assistant IA atteint. Réessayez dans une heure.',
  ),
  uploadsPerUser: new RateLimiter(
    limit('RATE_LIMIT_UPLOADS_PER_USER', 30), HOUR,
    'Trop d\'envois de photos. Réessayez dans une heure.',
  ),
}

export function clearRateLimits(): void {
  for (const limiter of Object.values(rateLimits)) limiter.clear()
}

export function pruneRateLimits(): void {
  for (const limiter of Object.values(rateLimits)) limiter.prune()
}
