import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { badRequest, notFound } from '../utils/errors'
import type { Producer } from '../models/types'

const DEFAULT_RADIUS_KM = 30
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const PRODUCER_COLUMNS = `
  p.id, p.user_id, p.company_name, p.description, p.address, p.city, p.postal_code,
  p.website_url, p.banner_url, p.opening_hours, p.is_verified, p.created_at,
  u.first_name, u.last_name,
  ST_Y(p.location) AS latitude, ST_X(p.location) AS longitude,
  ARRAY(SELECT DISTINCT pc.category::text FROM products pc
        WHERE pc.producer_id = p.id AND pc.is_available ORDER BY 1) AS category_codes`

/** Libellés affichés par les applications (même liste que le web). */
const CATEGORY_LABELS: Record<string, string> = {
  FRUITS_VEGETABLES: 'Fruits & Légumes',
  DAIRY: 'Produits laitiers',
  MEAT: 'Viandes',
  BEVERAGES: 'Boissons',
  FINE_GROCERY: 'Épicerie fine',
  CRAFTS: 'Artisanat',
  FLOWERS_PLANTS: 'Fleurs & Plantes',
  OTHER: 'Autre',
}

/** Ajoute `categories` (libellés) déduites des produits disponibles du producteur. */
function withCategories(row: Record<string, unknown>) {
  const { category_codes, ...rest } = row
  const codes = Array.isArray(category_codes) ? (category_codes as string[]) : []
  return { ...rest, categories: codes.map((c) => CATEGORY_LABELS[c] ?? c) }
}

const producerBody = t.Object({
  company_name:  t.String({ minLength: 1, maxLength: 255 }),
  description:   t.Optional(t.String({ maxLength: 5000 })),
  address:       t.Optional(t.String({ maxLength: 500 })),
  city:          t.Optional(t.String({ maxLength: 100 })),
  postal_code:   t.Optional(t.String({ pattern: '^[0-9]{5}$' })),
  latitude:      t.Optional(t.Number({ minimum: -90, maximum: 90 })),
  longitude:     t.Optional(t.Number({ minimum: -180, maximum: 180 })),
  website_url:   t.Optional(t.String({ maxLength: 500 })),
  banner_url:    t.Optional(t.String({ maxLength: 500 })),
  opening_hours: t.Optional(t.String({ maxLength: 500 })),
})

export const producersRoutes = new Elysia({ prefix: '/producers' })

  /**
   * GET /api/producers — recherche géolocalisée (PROD-3).
   * lat/lon/radius (km) filtrent avec ST_DWithin sur l'index GiST ; search filtre le nom.
   */
  .get(
    '/',
    async ({ query }) => {
      const { lat, lon, search } = query
      const radiusKm = query.radius ?? DEFAULT_RADIUS_KM
      const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
      const offset = query.offset ?? 0
      const hasGeo = lat !== undefined && lon !== undefined
      if ((lat === undefined) !== (lon === undefined)) {
        throw badRequest('lat et lon doivent être fournis ensemble')
      }

      const params: unknown[] = []
      const where: string[] = []
      let distanceSelect = 'NULL::float AS distance_km'

      if (hasGeo) {
        params.push(lon, lat)
        const point = 'ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography'
        distanceSelect = `ST_Distance(p.location::geography, ${point}) / 1000 AS distance_km`
        params.push(radiusKm * 1000)
        where.push(`ST_DWithin(p.location::geography, ${point}, $${params.length})`)
      }
      if (search) {
        params.push(`%${search}%`)
        where.push(`(p.company_name ILIKE $${params.length} OR p.description ILIKE $${params.length})`)
      }
      params.push(limit, offset)

      const result = await db.query(
        `SELECT ${PRODUCER_COLUMNS}, ${distanceSelect}
         FROM producers p
         JOIN users u ON u.id = p.user_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY ${hasGeo ? 'distance_km ASC' : 'p.created_at DESC'}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      return result.rows.map((row) => withCategories(row))
    },
    {
      query: t.Object({
        lat:    t.Optional(t.Number({ minimum: -90, maximum: 90 })),
        lon:    t.Optional(t.Number({ minimum: -180, maximum: 180 })),
        radius: t.Optional(t.Number({ minimum: 0.1, maximum: 500 })),
        limit:  t.Optional(t.Integer({ minimum: 1 })),
        offset: t.Optional(t.Integer({ minimum: 0 })),
        search: t.Optional(t.String({ maxLength: 100 })),
      }),
      detail: { summary: 'Liste des producteurs (géolocalisée)', tags: ['Producers'] },
    },
  )

  /** GET /api/producers/:id — fiche publique (PROD-5). */
  .get(
    '/:id',
    async ({ params }) => {
      const result = await db.query(
        `SELECT ${PRODUCER_COLUMNS}
         FROM producers p JOIN users u ON u.id = p.user_id
         WHERE p.id = $1`,
        [params.id],
      )
      if (!result.rows[0]) throw notFound('Producteur')
      return withCategories(result.rows[0])
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Fiche producteur', tags: ['Producers'] },
    },
  )

  .use(authGuard(['PRODUCER']))

  /** GET /api/producers/me — profil producteur du compte connecté (404 s'il n'existe pas encore). */
  .get(
    '/me',
    async ({ user }) => {
      const result = await db.query(
        `SELECT ${PRODUCER_COLUMNS}
         FROM producers p JOIN users u ON u.id = p.user_id
         WHERE p.user_id = $1`,
        [user.sub],
      )
      if (!result.rows[0]) throw notFound('Profil producteur')
      return withCategories(result.rows[0])
    },
    { detail: { summary: 'Mon profil producteur', tags: ['Producers'] } },
  )

  /** POST /api/producers — création ou mise à jour du profil producteur (PROD-1 / PROD-2). */
  .post(
    '/',
    async ({ body, user, set }) => {
      const hasLocation = body.latitude !== undefined && body.longitude !== undefined
      const result = await db.query<Producer & { inserted: boolean }>(
        `INSERT INTO producers
           (user_id, company_name, description, address, city, postal_code, location,
            website_url, banner_url, opening_hours)
         VALUES ($1, $2, $3, $4, $5, $6,
                 CASE WHEN $7::boolean THEN ST_SetSRID(ST_MakePoint($8, $9), 4326) END,
                 $10, $11, $12)
         ON CONFLICT (user_id) DO UPDATE SET
           company_name  = EXCLUDED.company_name,
           description   = EXCLUDED.description,
           address       = EXCLUDED.address,
           city          = EXCLUDED.city,
           postal_code   = EXCLUDED.postal_code,
           location      = COALESCE(EXCLUDED.location, producers.location),
           website_url   = EXCLUDED.website_url,
           banner_url    = EXCLUDED.banner_url,
           opening_hours = EXCLUDED.opening_hours
         RETURNING id, user_id, company_name, description, address, city, postal_code,
                   website_url, banner_url, opening_hours, is_verified, created_at,
                   ST_Y(location) AS latitude, ST_X(location) AS longitude,
                   (xmax = 0) AS inserted`,
        [user.sub, body.company_name.trim(), body.description ?? null, body.address ?? null,
          body.city ?? null, body.postal_code ?? null, hasLocation,
          body.longitude ?? null, body.latitude ?? null, body.website_url ?? null,
          body.banner_url ?? null, body.opening_hours ?? null],
      )
      const { inserted, ...producer } = result.rows[0]
      set.status = inserted ? 201 : 200
      return producer
    },
    {
      body: producerBody,
      detail: { summary: 'Créer/mettre à jour mon profil producteur', tags: ['Producers'] },
    },
  )
