import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { badRequest, notFound } from '../utils/errors'
import type { Message } from '../models/types'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authGuard())

  /**
   * GET /api/messages — boîte de réception (MSG-3) : un élément par interlocuteur,
   * avec le dernier message et le nombre de messages non lus, du plus récent au plus ancien.
   */
  .get(
    '/',
    async ({ user }) => {
      const result = await db.query(
        `WITH mine AS (
           SELECT m.*,
                  CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id
           FROM messages m
           WHERE m.sender_id = $1 OR m.receiver_id = $1
         ),
         last_message AS (
           SELECT DISTINCT ON (partner_id) partner_id, content, sent_at
           FROM mine ORDER BY partner_id, sent_at DESC
         ),
         unread AS (
           SELECT partner_id, COUNT(*)::int AS unread_count
           FROM mine WHERE receiver_id = $1 AND NOT is_read
           GROUP BY partner_id
         )
         SELECT lm.partner_id,
                COALESCE(pr.company_name, u.first_name || ' ' || u.last_name) AS partner_name,
                u.role AS partner_role,
                lm.content AS last_content,
                lm.sent_at AS last_sent_at,
                COALESCE(un.unread_count, 0) AS unread_count
         FROM last_message lm
         JOIN users u ON u.id = lm.partner_id
         LEFT JOIN producers pr ON pr.user_id = u.id
         LEFT JOIN unread un ON un.partner_id = lm.partner_id
         ORDER BY lm.sent_at DESC`,
        [user.sub],
      )
      return result.rows
    },
    { detail: { summary: 'Liste des conversations', tags: ['Messages'] } },
  )

  /** GET /api/messages/unread-count — badge global de notification (MSG-4). */
  .get(
    '/unread-count',
    async ({ user }) => {
      const result = await db.query<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM messages WHERE receiver_id = $1 AND NOT is_read',
        [user.sub],
      )
      return { unread_count: result.rows[0].count }
    },
    { detail: { summary: 'Nombre de messages non lus', tags: ['Messages'] } },
  )

  /** GET /api/messages/:partnerId — fil de discussion ; marque comme lus les messages reçus. */
  .get(
    '/:partnerId',
    async ({ params, user, query }) => {
      const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
      const values: unknown[] = [user.sub, params.partnerId, limit]
      if (query.before) values.push(query.before)

      // On prend les N plus récents puis on les remet dans l'ordre chronologique
      const result = await db.query<Message>(
        `SELECT * FROM (
           SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.sent_at,
                  u.first_name, u.last_name
           FROM messages m
           JOIN users u ON u.id = m.sender_id
           WHERE ((m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1))
             ${query.before ? 'AND m.sent_at < $4' : ''}
           ORDER BY m.sent_at DESC
           LIMIT $3
         ) recent ORDER BY sent_at ASC`,
        values,
      )

      await db.query(
        `UPDATE messages SET is_read = true
         WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
        [params.partnerId, user.sub],
      )

      return result.rows
    },
    {
      params: t.Object({ partnerId: t.String({ format: 'uuid' }) }),
      query: t.Object({
        limit:  t.Optional(t.Integer({ minimum: 1 })),
        before: t.Optional(t.String({ format: 'date-time' })),
      }),
      detail: { summary: 'Conversation avec un utilisateur', tags: ['Messages'] },
    },
  )

  /** POST /api/messages — envoyer un message (MSG-1 / MSG-2). */
  .post(
    '/',
    async ({ body, user, set }) => {
      const content = body.content.trim()
      if (!content) throw badRequest('Le message est vide')
      if (body.receiver_id === user.sub) throw badRequest('Impossible de s\'écrire à soi-même')

      const receiver = await db.query(
        'SELECT id FROM users WHERE id = $1 AND is_active',
        [body.receiver_id],
      )
      if (!receiver.rows[0]) throw notFound('Destinataire')

      const result = await db.query<Message>(
        `INSERT INTO messages (sender_id, receiver_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, sender_id, receiver_id, content, is_read, sent_at`,
        [user.sub, body.receiver_id, content],
      )
      set.status = 201
      return result.rows[0]
    },
    {
      body: t.Object({
        receiver_id: t.String({ format: 'uuid' }),
        content:     t.String({ minLength: 1, maxLength: 4000 }),
      }),
      detail: { summary: 'Envoyer un message', tags: ['Messages'] },
    },
  )
