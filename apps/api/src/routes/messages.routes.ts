import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { notFound, forbidden } from '../utils/errors'
import type { Message } from '../models/types'

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authGuard())

  /**
   * GET /api/messages
   * Liste les conversations de l'utilisateur courant (dernier message de chaque thread).
   */
  .get(
    '/',
    async ({ user }) => {
      const result = await db.query(
        `SELECT DISTINCT ON (partner_id)
                partner_id,
                partner_name,
                last_content,
                last_sent_at,
                unread_count
         FROM (
           SELECT
             CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
             u.first_name || ' ' || u.last_name AS partner_name,
             m.content AS last_content,
             m.sent_at AS last_sent_at,
             COUNT(m2.id) FILTER (WHERE m2.receiver_id = $1 AND NOT m2.is_read) AS unread_count
           FROM messages m
           JOIN users u ON u.id = (
             CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
           )
           LEFT JOIN messages m2 ON (
             m2.sender_id = u.id AND m2.receiver_id = $1
           )
           WHERE m.sender_id = $1 OR m.receiver_id = $1
           GROUP BY partner_id, partner_name, m.content, m.sent_at
         ) sub
         ORDER BY partner_id, last_sent_at DESC`,
        [user.sub],
      )
      return result.rows
    },
    { detail: { summary: 'Liste des conversations', tags: ['Messages'] } },
  )

  /**
   * GET /api/messages/:partnerId
   * Historique complet d'une conversation.
   */
  .get(
    '/:partnerId',
    async ({ params, user, query }) => {
      const { limit = 50, before } = query

      const result = await db.query<Message>(
        `SELECT m.*, u.first_name, u.last_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE (m.sender_id = $1 AND m.receiver_id = $2)
            OR (m.sender_id = $2 AND m.receiver_id = $1)
         ${before ? 'AND m.sent_at < $4' : ''}
         ORDER BY m.sent_at ASC
         LIMIT $3`,
        before
          ? [user.sub, params.partnerId, limit, before]
          : [user.sub, params.partnerId, limit],
      )

      // Marquer comme lus les messages reçus
      await db.query(
        `UPDATE messages SET is_read = true
         WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
        [params.partnerId, user.sub],
      )

      return result.rows
    },
    {
      query: t.Object({
        limit:  t.Optional(t.Number()),
        before: t.Optional(t.String()),
      }),
      detail: { summary: 'Conversation avec un utilisateur', tags: ['Messages'] },
    },
  )

  /** POST /api/messages — envoyer un message */
  .post(
    '/',
    async ({ body, user, set }) => {
      const { receiver_id, content } = body

      if (receiver_id === user.sub) {
        throw forbidden()
      }

      const receiver = await db.query(
        'SELECT id FROM users WHERE id = $1',
        [receiver_id],
      )
      if (!receiver.rows[0]) throw notFound('Destinataire')

      const result = await db.query<Message>(
        `INSERT INTO messages (sender_id, receiver_id, content)
         VALUES ($1, $2, $3) RETURNING *`,
        [user.sub, receiver_id, content.trim()],
      )
      set.status = 201
      return result.rows[0]
    },
    {
      body: t.Object({
        receiver_id: t.String(),
        content:     t.String({ minLength: 1 }),
      }),
      detail: { summary: 'Envoyer un message', tags: ['Messages'] },
    },
  )
