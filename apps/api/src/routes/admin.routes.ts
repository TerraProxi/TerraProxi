/**
 * Back-office administrateur (CDC « gestion des rôles : administrateurs ») :
 * vue d'ensemble, modération des comptes, vérification des producteurs.
 */
import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db, withTransaction } from '../db/client'
import { badRequest, notFound } from '../utils/errors'
import { revokeAllRefreshTokens } from '../utils/tokens'
import { notify } from '../services/notifications.service'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

const ADMIN_USER_COLUMNS = `u.id, u.email, u.first_name, u.last_name, u.role, u.phone, u.is_active, u.created_at,
  pr.id AS producer_id, pr.company_name`

const ADMIN_PRODUCER_COLUMNS = `pr.id, pr.user_id, pr.company_name, pr.city, pr.postal_code, pr.website_url,
  pr.is_verified, pr.created_at, u.email, u.first_name, u.last_name, u.is_active,
  (SELECT COUNT(*)::int FROM products p WHERE p.producer_id = pr.id) AS product_count`

const roleSchema = t.Union([t.Literal('CONSUMER'), t.Literal('PRODUCER'), t.Literal('ADMIN')])

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(authGuard(['ADMIN']))

  .get(
    '/stats',
    async () => {
      const result = await db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM users WHERE role = 'CONSUMER') AS consumers,
           (SELECT COUNT(*)::int FROM users WHERE role = 'PRODUCER') AS producers,
           (SELECT COUNT(*)::int FROM users WHERE NOT is_active) AS inactive_users,
           (SELECT COUNT(*)::int FROM producers WHERE NOT is_verified) AS producers_to_verify,
           (SELECT COUNT(*)::int FROM products) AS products,
           (SELECT COUNT(*)::int FROM orders WHERE status IN ('PAID', 'PREPARING', 'READY', 'COMPLETED')) AS paid_orders,
           (SELECT COALESCE(SUM(total_price), 0)::float FROM orders
             WHERE status IN ('PAID', 'PREPARING', 'READY', 'COMPLETED')) AS paid_revenue,
           (SELECT COUNT(*)::int FROM orders
             WHERE status IN ('PAID', 'PREPARING', 'READY', 'COMPLETED')
               AND created_at >= NOW() - interval '30 days') AS paid_orders_30d`,
      )
      return result.rows[0]
    },
    { detail: { summary: 'Indicateurs de la plateforme', tags: ['Admin'] } },
  )

  .get(
    '/users',
    async ({ query }) => {
      const params: unknown[] = []
      const where: string[] = []
      if (query.role) {
        params.push(query.role)
        where.push(`u.role = $${params.length}`)
      }
      if (query.search) {
        params.push(`%${query.search}%`)
        const n = params.length
        where.push(`(u.email ILIKE $${n} OR u.first_name ILIKE $${n} OR u.last_name ILIKE $${n}
          OR pr.company_name ILIKE $${n})`)
      }
      params.push(Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT), query.offset ?? 0)
      const result = await db.query(
        `SELECT ${ADMIN_USER_COLUMNS}
         FROM users u LEFT JOIN producers pr ON pr.user_id = u.id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY u.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      return result.rows
    },
    {
      query: t.Object({
        role:   t.Optional(roleSchema),
        search: t.Optional(t.String({ maxLength: 100 })),
        limit:  t.Optional(t.Integer({ minimum: 1 })),
        offset: t.Optional(t.Integer({ minimum: 0 })),
      }),
      detail: { summary: 'Comptes utilisateurs', tags: ['Admin'] },
    },
  )

  /** Suspendre / réactiver un compte. Une suspension coupe immédiatement toutes ses sessions. */
  .patch(
    '/users/:id',
    async ({ params, body, user }) => {
      if (params.id === user.sub) throw badRequest('Un administrateur ne peut pas modifier son propre compte ici')
      return withTransaction(async (client) => {
        const updated = await client.query<{ id: string }>(
          'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id',
          [body.is_active, params.id],
        )
        if (!updated.rows[0]) throw notFound('Utilisateur')
        if (!body.is_active) await revokeAllRefreshTokens(params.id, client)
        const result = await client.query(
          `SELECT ${ADMIN_USER_COLUMNS} FROM users u LEFT JOIN producers pr ON pr.user_id = u.id WHERE u.id = $1`,
          [params.id],
        )
        return result.rows[0]
      })
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({ is_active: t.Boolean() }),
      detail: { summary: 'Suspendre ou réactiver un compte', tags: ['Admin'] },
    },
  )

  .get(
    '/producers',
    async ({ query }) => {
      const params: unknown[] = []
      const where: string[] = []
      if (query.verified !== undefined) {
        params.push(query.verified)
        where.push(`pr.is_verified = $${params.length}`)
      }
      params.push(Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT), query.offset ?? 0)
      const result = await db.query(
        `SELECT ${ADMIN_PRODUCER_COLUMNS}
         FROM producers pr JOIN users u ON u.id = pr.user_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY pr.is_verified, pr.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      return result.rows
    },
    {
      query: t.Object({
        verified: t.Optional(t.BooleanString()),
        limit:    t.Optional(t.Integer({ minimum: 1 })),
        offset:   t.Optional(t.Integer({ minimum: 0 })),
      }),
      detail: { summary: 'Producteurs à vérifier', tags: ['Admin'] },
    },
  )

  /** Vérifier une exploitation (badge « Producteur vérifié » dans les applications). */
  .patch(
    '/producers/:id',
    async ({ params, body }) => {
      const updated = await db.query<{ user_id: string; was_verified: boolean }>(
        `UPDATE producers pr SET is_verified = $1
         FROM (SELECT id, is_verified AS was_verified FROM producers WHERE id = $2) old
         WHERE pr.id = old.id
         RETURNING pr.user_id, old.was_verified`,
        [body.is_verified, params.id],
      )
      const row = updated.rows[0]
      if (!row) throw notFound('Producteur')

      if (body.is_verified && !row.was_verified) {
        await notify({
          userId: row.user_id,
          type: 'ACCOUNT',
          title: 'Exploitation vérifiée',
          body: 'TerraProxi a vérifié votre exploitation : le badge « Producteur vérifié » apparaît sur votre fiche.',
          targetType: 'PRODUCER',
          targetId: params.id,
        })
      }
      const result = await db.query(
        `SELECT ${ADMIN_PRODUCER_COLUMNS} FROM producers pr JOIN users u ON u.id = pr.user_id WHERE pr.id = $1`,
        [params.id],
      )
      return result.rows[0]
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({ is_verified: t.Boolean() }),
      detail: { summary: 'Vérifier un producteur', tags: ['Admin'] },
    },
  )
