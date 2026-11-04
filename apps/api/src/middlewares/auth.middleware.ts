import '../config/env'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import type { JwtPayload, UserRole } from '../models/types'
import { requireEnv } from '../config/env'
import { AppError } from '../utils/errors'

export const jwtPlugin = new Elysia({ name: 'jwt' }).use(
  jwt({
    name: 'jwt',
    secret: requireEnv('JWT_SECRET'),
    exp: process.env.JWT_EXPIRES_IN ?? '15m',
  }),
)

const isUserRole = (value: unknown): value is UserRole =>
  value === 'CONSUMER' || value === 'PRODUCER' || value === 'ADMIN'

/**
 * Vérifie le Bearer token JWT et injecte `user: JwtPayload` dans le contexte.
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

      if (roles && !roles.includes(payload.role)) {
        throw new AppError(403, 'Accès non autorisé pour ce rôle')
      }

      const user: JwtPayload = { sub: payload.sub, role: payload.role }
      return { user }
    })
