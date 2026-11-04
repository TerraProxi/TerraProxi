import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db, withTransaction } from '../db/client'
import { hashPassword, verifyPassword } from '../utils/hash'
import { AppError, conflict, notFound } from '../utils/errors'
import { revokeAllRefreshTokens } from '../utils/tokens'
import type { User } from '../models/types'

const PUBLIC_USER_COLUMNS = 'id, email, first_name, last_name, role, phone, avatar_url, created_at'
const UNIQUE_VIOLATION = '23505'

async function assertCurrentPassword(userId: string, currentPassword: string) {
  const result = await db.query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId],
  )
  const hash = result.rows[0]?.password_hash
  if (!hash) throw notFound('Utilisateur')
  if (!(await verifyPassword(currentPassword, hash))) {
    throw new AppError(403, 'Mot de passe actuel incorrect')
  }
}

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(authGuard())

  .get(
    '/profile',
    async ({ user }) => {
      const result = await db.query<User>(
        `SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = $1`,
        [user.sub],
      )
      if (!result.rows[0]) throw notFound('Utilisateur')
      return result.rows[0]
    },
    { detail: { summary: 'Mon profil', tags: ['Users'] } },
  )

  .patch(
    '/profile',
    async ({ body, user }) => {
      const { first_name, last_name, phone, avatar_url } = body
      const result = await db.query<User>(
        `UPDATE users SET
           first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           phone      = COALESCE($3, phone),
           avatar_url = COALESCE($4, avatar_url)
         WHERE id = $5
         RETURNING ${PUBLIC_USER_COLUMNS}`,
        [first_name?.trim(), last_name?.trim(), phone?.trim(), avatar_url?.trim(), user.sub],
      )
      if (!result.rows[0]) throw notFound('Utilisateur')
      return result.rows[0]
    },
    {
      body: t.Object({
        first_name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        last_name:  t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        phone:      t.Optional(t.String({ maxLength: 20 })),
        avatar_url: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: { summary: 'Modifier mon profil', tags: ['Users'] },
    },
  )

  /** AUTH-6 — changement de mot de passe ; révoque toutes les sessions ouvertes. */
  .put(
    '/me/password',
    async ({ body, user, set }) => {
      await assertCurrentPassword(user.sub, body.current_password)
      const newHash = await hashPassword(body.new_password)
      await withTransaction(async (client) => {
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.sub])
        await revokeAllRefreshTokens(user.sub, client)
      })
      set.status = 204
    },
    {
      body: t.Object({
        current_password: t.String({ minLength: 1 }),
        new_password:     t.String({ minLength: 8, maxLength: 128 }),
      }),
      detail: { summary: 'Changer mon mot de passe', tags: ['Users'] },
    },
  )

  /** AUTH-6 — changement d'adresse email (mot de passe actuel requis). */
  .put(
    '/me/email',
    async ({ body, user }) => {
      await assertCurrentPassword(user.sub, body.current_password)
      try {
        const result = await db.query<User>(
          `UPDATE users SET email = $1 WHERE id = $2 RETURNING ${PUBLIC_USER_COLUMNS}`,
          [body.new_email.trim().toLowerCase(), user.sub],
        )
        return result.rows[0]
      } catch (err) {
        if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
          throw conflict('Cette adresse email est déjà utilisée')
        }
        throw err
      }
    },
    {
      body: t.Object({
        current_password: t.String({ minLength: 1 }),
        new_email:        t.String({ format: 'email', maxLength: 255 }),
      }),
      detail: { summary: 'Changer mon adresse email', tags: ['Users'] },
    },
  )

  /** RGPD — droit d'accès et à la portabilité : export JSON de toutes mes données. */
  .get(
    '/me/export',
    async ({ user, set }) => {
      const [profile, producer, orders, messages] = await Promise.all([
        db.query(
          `SELECT ${PUBLIC_USER_COLUMNS}, gdpr_consent, gdpr_consent_at, updated_at
           FROM users WHERE id = $1`,
          [user.sub],
        ),
        db.query(
          `SELECT id, user_id, company_name, description, address, city, postal_code, website_url,
                  banner_url, opening_hours, is_verified, created_at,
                  ST_Y(location) AS latitude, ST_X(location) AS longitude
           FROM producers WHERE user_id = $1`,
          [user.sub],
        ),
        db.query(
          `SELECT o.id, o.status, o.total_price::float AS total_price, o.delivery_mode, o.notes, o.created_at,
                  COALESCE(json_agg(json_build_object(
                    'product_name', oi.product_name, 'quantity', oi.quantity,
                    'unit_price', oi.unit_price::float)) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
           FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
           WHERE o.consumer_id = $1
           GROUP BY o.id ORDER BY o.created_at DESC`,
          [user.sub],
        ),
        db.query(
          `SELECT id, sender_id, receiver_id, content, is_read, sent_at
           FROM messages WHERE sender_id = $1 OR receiver_id = $1 ORDER BY sent_at`,
          [user.sub],
        ),
      ])
      if (!profile.rows[0]) throw notFound('Utilisateur')

      set.headers['content-disposition'] = 'attachment; filename="terraproxi-mes-donnees.json"'
      return {
        exported_at: new Date().toISOString(),
        profile: profile.rows[0],
        producer: producer.rows[0] ?? null,
        orders: orders.rows,
        messages: messages.rows,
      }
    },
    { detail: { summary: 'Exporter mes données (RGPD)', tags: ['Users'] } },
  )

  /**
   * RGPD — droit à l'oubli. Supprime le compte, son profil producteur, ses
   * produits, ses messages et ses sessions ; les commandes sont anonymisées
   * (migration 002) car elles relèvent d'une obligation comptable.
   */
  .delete(
    '/me',
    async ({ user, set }) => {
      const result = await db.query('DELETE FROM users WHERE id = $1', [user.sub])
      if (!result.rowCount) throw notFound('Utilisateur')
      set.status = 204
    },
    { detail: { summary: 'Supprimer mon compte (RGPD)', tags: ['Users'] } },
  )
