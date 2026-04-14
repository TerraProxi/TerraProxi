import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { notFound, forbidden } from '../utils/errors'
import type { Producer } from '../models/types'

export const producersRoutes = new Elysia({ prefix: '/producers' })

  /**
   * GET /api/producers
   * Recherche géolocalisée : lat, lon, radius (km), category, limit, offset
   */
  .get(
    '/',
    async ({ query }) => {
      const { lat, lon, radius = 30, limit = 20, offset = 0, search } = query

      if (lat !== undefined && lon !== undefined) {
        // Requête spatiale PostGIS — ST_DWithin sur géographie
        const sql = `
          SELECT
            p.*,
            u.first_name, u.last_name, u.email,
            ST_Y(p.location::geometry) AS latitude,
            ST_X(p.location::geometry) AS longitude,
            ST_Distance(
              p.location::geography,
              ST_GeogFromText('POINT(' || $2 || ' ' || $1 || ')')
            ) / 1000 AS distance_km
          FROM producers p
          JOIN users u ON u.id = p.user_id
          WHERE ST_DWithin(
            p.location::geography,
            ST_GeogFromText('POINT(' || $2 || ' ' || $1 || ')'),
            $3 * 1000
          )
          ${search ? "AND (p.company_name ILIKE $5 OR p.description ILIKE $5)" : ''}
          ORDER BY distance_km ASC
          LIMIT $4
          OFFSET ${offset}
        `
        const params: unknown[] = [lat, lon, radius, limit]
        if (search) params.push(`%${search}%`)

        const result = await db.query(sql, params)
        return result.rows
      }

      // Sans géolocalisation — liste simple
      const result = await db.query(
        `SELECT p.*, u.first_name, u.last_name,
                ST_Y(p.location::geometry) AS latitude,
                ST_X(p.location::geometry) AS longitude
         FROM producers p
         JOIN users u ON u.id = p.user_id
         ${search ? "WHERE p.company_name ILIKE $1 OR p.description ILIKE $1" : ''}
         ORDER BY p.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        search ? [`%${search}%`] : [],
      )
      return result.rows
    },
    {
      query: t.Object({
        lat:    t.Optional(t.Number()),
        lon:    t.Optional(t.Number()),
        radius: t.Optional(t.Number()),
        limit:  t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
        search: t.Optional(t.String()),
      }),
      detail: { summary: 'Liste des producteurs (géolocalisée)', tags: ['Producers'] },
    },
  )

  /** GET /api/producers/:id — fiche publique d'un producteur */
  .get(
    '/:id',
    async ({ params }) => {
      const result = await db.query(
        `SELECT p.*,
                u.first_name, u.last_name, u.email,
                ST_Y(p.location::geometry) AS latitude,
                ST_X(p.location::geometry) AS longitude
         FROM producers p
         JOIN users u ON u.id = p.user_id
         WHERE p.id = $1`,
        [params.id],
      )
      if (!result.rows[0]) throw notFound('Producteur')
      return result.rows[0]
    },
    { detail: { summary: 'Fiche producteur', tags: ['Producers'] } },
  )

  /** POST /api/producers — création du profil producteur (rôle PRODUCER) */
  .use(authGuard(['PRODUCER']))
  .post(
    '/',
    async ({ body, user, set }) => {
      const { company_name, description, address, city, postal_code,
              latitude, longitude, website_url } = body

      const existing = await db.query<Producer>(
        'SELECT id FROM producers WHERE user_id = $1',
        [user.sub],
      )
      if (existing.rows.length > 0) {
        // Mise à jour si déjà existant
        const upd = await db.query<Producer>(
          `UPDATE producers SET
             company_name = $1, description = $2, address = $3,
             city = $4, postal_code = $5,
             location = ST_SetSRID(ST_MakePoint($6, $7), 4326),
             website_url = $8
           WHERE user_id = $9
           RETURNING id, company_name, description, city, is_verified`,
          [company_name, description, address, city, postal_code,
            longitude, latitude, website_url, user.sub],
        )
        return upd.rows[0]
      }

      const result = await db.query<Producer>(
        `INSERT INTO producers
           (user_id, company_name, description, address, city, postal_code,
            location, website_url)
         VALUES ($1, $2, $3, $4, $5, $6,
                 ST_SetSRID(ST_MakePoint($7, $8), 4326), $9)
         RETURNING id, company_name, description, city, is_verified`,
        [user.sub, company_name, description, address, city, postal_code,
          longitude, latitude, website_url],
      )
      set.status = 201
      return result.rows[0]
    },
    {
      body: t.Object({
        company_name: t.String({ minLength: 1 }),
        description:  t.Optional(t.String()),
        address:      t.Optional(t.String()),
        city:         t.Optional(t.String()),
        postal_code:  t.Optional(t.String()),
        latitude:     t.Optional(t.Number()),
        longitude:    t.Optional(t.Number()),
        website_url:  t.Optional(t.String()),
      }),
      detail: { summary: 'Créer/mettre à jour le profil producteur', tags: ['Producers'] },
    },
  )
