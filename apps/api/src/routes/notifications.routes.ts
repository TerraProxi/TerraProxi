/** EPIC 7 — Notifications in-app (NOTIF-1 à NOTIF-3). */
import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { notFound } from '../utils/errors'

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

const NOTIFICATION_COLUMNS = 'id, type, title, body, target_type, target_id, is_read, created_at'

export const notificationsRoutes = new Elysia({ prefix: '/notifications' })
  .use(authGuard())

  /** GET /api/notifications — les plus récentes d'abord. */
  .get(
    '/',
    async ({ user, query }) => {
      const result = await db.query(
        `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
         WHERE user_id = $1 ${query.unread_only ? 'AND NOT is_read' : ''}
         ORDER BY created_at DESC, id
         LIMIT $2 OFFSET $3`,
        [user.sub, Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT), query.offset ?? 0],
      )
      return result.rows
    },
    {
      query: t.Object({
        unread_only: t.Optional(t.BooleanString()),
        limit:       t.Optional(t.Integer({ minimum: 1 })),
        offset:      t.Optional(t.Integer({ minimum: 0 })),
      }),
      detail: { summary: 'Mes notifications', tags: ['Notifications'] },
    },
  )

  /** GET /api/notifications/unread-count — badge de la cloche. */
  .get(
    '/unread-count',
    async ({ user }) => {
      const result = await db.query<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND NOT is_read',
        [user.sub],
      )
      return { unread_count: result.rows[0].count }
    },
    { detail: { summary: 'Nombre de notifications non lues', tags: ['Notifications'] } },
  )

  .post(
    '/read-all',
    async ({ user, set }) => {
      await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND NOT is_read', [user.sub])
      set.status = 204
    },
    { detail: { summary: 'Tout marquer comme lu', tags: ['Notifications'] } },
  )

  .patch(
    '/:id/read',
    async ({ params, user }) => {
      const result = await db.query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2
         RETURNING ${NOTIFICATION_COLUMNS}`,
        [params.id, user.sub],
      )
      if (!result.rows[0]) throw notFound('Notification')
      return result.rows[0]
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Marquer une notification comme lue', tags: ['Notifications'] },
    },
  )
