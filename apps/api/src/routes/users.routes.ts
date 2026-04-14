import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { notFound, forbidden } from '../utils/errors'
import type { User } from '../models/types'

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(authGuard())

  /** GET /api/users/profile — profil de l'utilisateur courant */
  .get(
    '/profile',
    async ({ user }) => {
      const result = await db.query<User>(
        `SELECT id, email, first_name, last_name, role, phone, avatar_url, created_at
         FROM users WHERE id = $1`,
        [user.sub],
      )
      if (!result.rows[0]) throw notFound('Utilisateur')
      return result.rows[0]
    },
    { detail: { summary: 'Mon profil', tags: ['Users'] } },
  )

  /** PATCH /api/users/profile — modification du profil */
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
         RETURNING id, email, first_name, last_name, role, phone, avatar_url`,
        [first_name, last_name, phone, avatar_url, user.sub],
      )
      return result.rows[0]
    },
    {
      body: t.Object({
        first_name: t.Optional(t.String()),
        last_name:  t.Optional(t.String()),
        phone:      t.Optional(t.String()),
        avatar_url: t.Optional(t.String()),
      }),
      detail: { summary: 'Modifier mon profil', tags: ['Users'] },
    },
  )

  /**
   * DELETE /api/users/me — droit à l'oubli RGPD
   * Supprime le compte et toutes les données associées (CASCADE en DB).
   */
  .delete(
    '/me',
    async ({ user, set }) => {
      await db.query('DELETE FROM users WHERE id = $1', [user.sub])
      set.status = 204
    },
    { detail: { summary: 'Supprimer mon compte (RGPD)', tags: ['Users'] } },
  )
