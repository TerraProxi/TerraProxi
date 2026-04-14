import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import type { JwtPayload, UserRole } from '../models/types'
import { AppError } from '../utils/errors'

export const jwtPlugin = new Elysia({ name: 'jwt' }).use(
  jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
    exp: process.env.JWT_EXPIRES_IN ?? '15m',
  }),
)

/**
 * Extrait et vérifie le Bearer token JWT de la requête.
 * Injecte `user: JwtPayload` dans le contexte si valide.
 */
export const authGuard = (roles?: UserRole[]) =>
  new Elysia({ name: `auth-guard-${roles?.join('-') ?? 'any'}` })
    .use(jwtPlugin)
    .derive(async ({ jwt, headers, set }) => {
      const authHeader = headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        set.status = 401
        throw new AppError(401, 'Token manquant')
      }

      const token = authHeader.slice(7)
      const payload = await jwt.verify(token) as JwtPayload | false

      if (!payload) {
        set.status = 401
        throw new AppError(401, 'Token invalide ou expiré')
      }

      if (roles && !roles.includes(payload.role)) {
        set.status = 403
        throw new AppError(403, 'Accès non autorisé pour ce rôle')
      }

      return { user: payload }
    })
