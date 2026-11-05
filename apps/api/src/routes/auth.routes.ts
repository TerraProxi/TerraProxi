import { Elysia, t } from 'elysia'
import { authGuard, jwtPlugin } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { hashPassword, verifyPassword } from '../utils/hash'
import { AppError, conflict, badRequest, notFound } from '../utils/errors'
import { rateLimits } from '../utils/rate-limit'
import { clientIp } from '../utils/request'
import { consumeRefreshToken, issueRefreshToken, revokeRefreshToken } from '../utils/tokens'
import { PUBLIC_USER_COLUMNS, type User, type UserRole } from '../models/types'

const UNIQUE_VIOLATION = '23505'

const passwordSchema = t.String({ minLength: 8, maxLength: 128 })

const refreshBody = t.Object({ refresh_token: t.String({ minLength: 1 }) })

/**
 * Empreinte comparée quand l'email est inconnu : la réponse prend le même temps
 * qu'avec un compte existant, ce qui empêche de deviner les emails inscrits.
 */
let dummyHash: Promise<string> | null = null
const getDummyHash = () => (dummyHash ??= hashPassword('terraproxi-compte-inexistant'))

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)

  .post(
    '/register',
    async ({ body, jwt, set, request, server }) => {
      rateLimits.registrationsPerIp.hit(clientIp(request, server))
      const { email, password, first_name, last_name, role, gdpr_consent, newsletter_opt_in } = body
      if (!gdpr_consent) throw badRequest('Le consentement RGPD est obligatoire')

      const password_hash = await hashPassword(password)
      let user: User
      try {
        const result = await db.query<User>(
          `INSERT INTO users
             (email, password_hash, first_name, last_name, role, gdpr_consent, gdpr_consent_at, newsletter_opt_in)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), $6)
           RETURNING ${PUBLIC_USER_COLUMNS}`,
          [email.trim().toLowerCase(), password_hash, first_name.trim(), last_name.trim(),
            role ?? 'CONSUMER', newsletter_opt_in ?? false],
        )
        user = result.rows[0]
      } catch (err) {
        if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
          throw conflict('Un compte existe déjà avec cette adresse email')
        }
        throw err
      }

      const access_token = await jwt.sign({ sub: user.id, role: user.role })
      const refresh_token = await issueRefreshToken(user.id)

      set.status = 201
      return { user, access_token, refresh_token }
    },
    {
      body: t.Object({
        email:             t.String({ format: 'email', maxLength: 255 }),
        password:          passwordSchema,
        first_name:        t.String({ minLength: 1, maxLength: 100 }),
        last_name:         t.String({ minLength: 1, maxLength: 100 }),
        role:              t.Optional(t.Union([t.Literal('CONSUMER'), t.Literal('PRODUCER')])),
        gdpr_consent:      t.Boolean(),
        newsletter_opt_in: t.Optional(t.Boolean()),
      }),
      detail: { summary: 'Inscription', tags: ['Auth'] },
    },
  )

  /**
   * Connexion. Protection contre la force brute (CDC « tentatives de connexion
   * frauduleuses ») : 5 échecs par compte et par IP, 30 échecs par IP, sur 15 min → 429.
   */
  .post(
    '/login',
    async ({ body, jwt, request, server }) => {
      const email = body.email.trim().toLowerCase()
      const ip = clientIp(request, server)
      const accountKey = `${ip}|${email}`
      rateLimits.loginFailuresPerAccount.assertAllowed(accountKey)
      rateLimits.loginFailuresPerIp.assertAllowed(ip)

      const result = await db.query<User & { password_hash: string }>(
        `SELECT ${PUBLIC_USER_COLUMNS}, password_hash, is_active FROM users WHERE email = $1`,
        [email],
      )
      const user = result.rows[0]
      const isPasswordValid = await verifyPassword(body.password, user?.password_hash ?? await getDummyHash())

      if (!user || !user.is_active || !isPasswordValid) {
        rateLimits.loginFailuresPerAccount.hit(accountKey)
        rateLimits.loginFailuresPerIp.hit(ip)
        throw new AppError(401, 'Email ou mot de passe incorrect')
      }
      rateLimits.loginFailuresPerAccount.reset(accountKey)

      const access_token = await jwt.sign({ sub: user.id, role: user.role })
      const refresh_token = await issueRefreshToken(user.id)

      const { password_hash: _hash, is_active: _active, ...safeUser } = user
      return { user: safeUser, access_token, refresh_token }
    },
    {
      body: t.Object({
        email:    t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
      detail: { summary: 'Connexion', tags: ['Auth'] },
    },
  )

  /** Échange un refresh token (usage unique) contre une nouvelle paire de jetons. */
  .post(
    '/refresh',
    async ({ body, jwt }) => {
      const userId = await consumeRefreshToken(body.refresh_token)
      if (!userId) throw new AppError(401, 'Session expirée, reconnectez-vous')

      const result = await db.query<{ id: string; role: UserRole; is_active: boolean }>(
        'SELECT id, role, is_active FROM users WHERE id = $1',
        [userId],
      )
      const user = result.rows[0]
      if (!user?.is_active) throw new AppError(401, 'Compte désactivé')

      const access_token = await jwt.sign({ sub: user.id, role: user.role })
      const refresh_token = await issueRefreshToken(user.id)
      return { access_token, refresh_token }
    },
    { body: refreshBody, detail: { summary: 'Renouveler la session', tags: ['Auth'] } },
  )

  /** Invalide le refresh token côté serveur (AUTH-4). */
  .post(
    '/logout',
    async ({ body, set }) => {
      await revokeRefreshToken(body.refresh_token)
      set.status = 204
    },
    { body: refreshBody, detail: { summary: 'Déconnexion', tags: ['Auth'] } },
  )

  .use(authGuard())
  .get(
    '/me',
    async ({ user }) => {
      const result = await db.query<User>(
        `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`,
        [user.sub],
      )
      if (!result.rows[0]) throw notFound('Utilisateur')
      return result.rows[0]
    },
    { detail: { summary: 'Profil courant', tags: ['Auth'], security: [{ bearerAuth: [] }] } },
  )
