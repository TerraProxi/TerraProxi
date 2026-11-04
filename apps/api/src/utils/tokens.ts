import { createHash, randomBytes } from 'node:crypto'
import { db } from '../db/client'

const DEFAULT_REFRESH_DAYS = 7
const REFRESH_TOKEN_BYTES = 32

/** Convertit "7d", "12h", "30m" en millisecondes (défaut : 7 jours). */
export function parseDuration(value: string | undefined): number {
  const match = value?.trim().match(/^(\d+)\s*([dhm])$/)
  if (!match) return DEFAULT_REFRESH_DAYS * 24 * 3600 * 1000
  const amount = Number(match[1])
  const unitMs = { d: 24 * 3600 * 1000, h: 3600 * 1000, m: 60 * 1000 }[match[2] as 'd' | 'h' | 'm']
  return amount * unitMs
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Pool ou client de transaction : tout objet exposant `query(text, params)`. */
type Queryable = { query: (text: string, params?: unknown[]) => Promise<unknown> }

/**
 * Crée un refresh token opaque. Seul son empreinte SHA-256 est stockée :
 * une fuite de la table ne permet pas de rejouer les sessions.
 */
export async function issueRefreshToken(userId: string, conn: Queryable = db): Promise<string> {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
  const expiresAt = new Date(Date.now() + parseDuration(process.env.JWT_REFRESH_EXPIRES_IN))
  await conn.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(token), expiresAt],
  )
  return token
}

/** Consomme un refresh token (usage unique) et renvoie son propriétaire. */
export async function consumeRefreshToken(token: string): Promise<string | null> {
  const result = await db.query<{ user_id: string }>(
    `DELETE FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(token)],
  )
  return result.rows[0]?.user_id ?? null
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hashToken(token)])
}

export async function revokeAllRefreshTokens(userId: string, conn: Queryable = db): Promise<void> {
  await conn.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId])
}
