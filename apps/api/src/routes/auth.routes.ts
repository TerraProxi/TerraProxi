import { Elysia, t } from 'elysia'
import { jwtPlugin } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { hashPassword, verifyPassword } from '../utils/hash'
import { AppError, conflict, badRequest } from '../utils/errors'
import type { User } from '../models/types'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)

  .post(
    '/register',
    async ({ body, jwt, set }) => {
      const { email, password, first_name, last_name, role, gdpr_consent } = body

      if (!gdpr_consent) {
        throw badRequest('Le consentement RGPD est obligatoire')
      }

      const existing = await db.query<User>(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()],
      )
      if (existing.rows.length > 0) {
        throw conflict('Un compte existe déjà avec cette adresse email')
      }

      const password_hash = await hashPassword(password)

      const result = await db.query<User>(
        `INSERT INTO users
           (email, password_hash, first_name, last_name, role, gdpr_consent, gdpr_consent_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, email, first_name, last_name, role, created_at`,
        [email.toLowerCase(), password_hash, first_name, last_name,
          role ?? 'CONSUMER', true],
      )

      const user = result.rows[0]
      const access_token = await jwt.sign({ sub: user.id, role: user.role })

      set.status = 201
      return { user, access_token }
    },
    {
      body: t.Object({
        email:        t.String({ format: 'email' }),
        password:     t.String({ minLength: 8 }),
        first_name:   t.String({ minLength: 1 }),
        last_name:    t.String({ minLength: 1 }),
        role:         t.Optional(t.Union([t.Literal('CONSUMER'), t.Literal('PRODUCER')])),
        gdpr_consent: t.Boolean(),
      }),
      detail: { summary: 'Inscription', tags: ['Auth'] },
    },
  )

  .post(
    '/login',
    async ({ body, jwt }) => {
      const { email, password } = body

      const result = await db.query<User & { password_hash: string }>(
        `SELECT id, email, password_hash, first_name, last_name, role, is_active
         FROM users WHERE email = $1`,
        [email.toLowerCase()],
      )

      const user = result.rows[0]
      if (!user || !user.is_active) {
        throw new AppError(401, 'Email ou mot de passe incorrect')
      }

      const valid = await verifyPassword(password, user.password_hash)
      if (!valid) {
        throw new AppError(401, 'Email ou mot de passe incorrect')
      }

      const access_token = await jwt.sign({ sub: user.id, role: user.role })

      const { password_hash: _, ...safeUser } = user
      return { user: safeUser, access_token }
    },
    {
      body: t.Object({
        email:    t.String({ format: 'email' }),
        password: t.String(),
      }),
      detail: { summary: 'Connexion', tags: ['Auth'] },
    },
  )

  .get(
    '/me',
    async ({ headers, jwt }) => {
      const token = headers.authorization?.slice(7)
      if (!token) throw new AppError(401, 'Token manquant')

      const payload = await jwt.verify(token)
      if (!payload) throw new AppError(401, 'Token invalide')

      const result = await db.query<User>(
        `SELECT id, email, first_name, last_name, role, phone, avatar_url, created_at
         FROM users WHERE id = $1`,
        [(payload as { sub: string }).sub],
      )
      if (!result.rows[0]) throw new AppError(404, 'Utilisateur introuvable')

      return result.rows[0]
    },
    { detail: { summary: 'Profil courant', tags: ['Auth'] } },
  )
