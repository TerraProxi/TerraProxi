import '../config/env'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import type { JwtPayload, UserRole } from '../models/types'
import { requireEnv } from '../config/env'
import { db } from '../db/client'
import { AppError } from '../utils/errors'
import { log } from '../utils/logger'

const MIN_SECRET_LENGTH = 32

/**
 * Secret de signature des JWT. En production, un secret court ou laissé à la valeur
 * d'exemple de .env.example empêche le démarrage : il permettrait de forger des jetons.
 */
export function jwtSecret(): string {
  const secret = requireEnv('JWT_SECRET')
  const isWeak = secret.length < MIN_SECRET_LENGTH || secret.includes('CHANGE_ME')
  if (isWeak && process.env.NODE_ENV === 'production') {
    throw new Error(
      `JWT_SECRET trop faible : ${MIN_SECRET_LENGTH} caractères aléatoires minimum (openssl rand -base64 48).`,
    )
  }
  if (isWeak) log.warn('JWT_SECRET faible : acceptable en développement uniquement')
  return secret
}

export const jwtPlugin = new Elysia({ name: 'jwt' }).use(
  jwt({
    name: 'jwt',
    secret: jwtSecret(),
    exp: process.env.JWT_EXPIRES_IN ?? '15m',
  }),
)

const isUserRole = (value: unknown): value is UserRole =>
  value === 'CONSUMER' || value === 'PRODUCER' || value === 'ADMIN'

/**
 * Vérifie le Bearer token JWT et injecte `user: JwtPayload` dans le contexte.
 *
 * Le compte est relu à chaque requête : un compte désactivé par un administrateur
 * ou supprimé perd l'accès immédiatement, sans attendre l'expiration du jeton.
 *
 * `as: 'scoped'` est indispensable : sans lui, Elysia limite le `derive` au
 * plugin lui-même et les routes du module parent ne reçoivent jamais `user`.
 * Pas de `name` : Elysia dédupliquerait le plugin entre modules de routes et
 * certains modules se retrouveraient sans garde.
 */
export const authGuard = (roles?: UserRole[]) =>
  new Elysia()
    .use(jwtPlugin)
    .derive({ as: 'scoped' }, async ({ jwt, headers }) => {
      const authHeader = headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError(401, 'Token manquant')
      }

      const payload = await jwt.verify(authHeader.slice(7))
      if (!payload || typeof payload.sub !== 'string' || !isUserRole(payload.role)) {
        throw new AppError(401, 'Token invalide ou expiré')
      }

      const account = await db.query<{ role: UserRole; is_active: boolean }>(
        'SELECT role, is_active FROM users WHERE id = $1',
        [payload.sub],
      )
      const current = account.rows[0]
      if (!current?.is_active) throw new AppError(401, 'Compte désactivé ou supprimé')

      if (roles && !roles.includes(current.role)) {
        throw new AppError(403, 'Accès non autorisé pour ce rôle')
      }

      const user: JwtPayload = { sub: payload.sub, role: current.role }
      return { user }
    })
