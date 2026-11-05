import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { badRequest, notFound } from '../utils/errors'
import { RateLimitError } from '../utils/rate-limit'
import { emptyToNull, httpUrl } from '../utils/validation'
import { notify } from '../services/notifications.service'
import type { Producer } from '../models/types'

const DEFAULT_RADIUS_KM = 30
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const DEFAULT_STATS_DAYS = 30
const LOW_STOCK_THRESHOLD = 5
const TOP_PRODUCTS = 5
const NEWSLETTER_COOLDOWN_HOURS = 24
const SECONDS_PER_HOUR = 3600

/** Statuts d'une commande encaissée (chiffre d'affaires, clientèle). */
const PAID_STATUSES = `('PAID', 'PREPARING', 'READY', 'COMPLETED')`

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
  website_url:   t.Optional(httpUrl()),
  banner_url:    t.Optional(httpUrl()),
  opening_hours: t.Optional(t.String({ maxLength: 500 })),
})

async function findOwnProducerId(userId: string): Promise<string> {
  const res = await db.query<{ id: string }>('SELECT id FROM producers WHERE user_id = $1', [userId])
  if (!res.rows[0]) throw notFound('Profil producteur')
  return res.rows[0].id
}

/**
 * Tableau de bord et statistiques de vente (BO-1, BO-5) sur les `days` derniers jours,
 * jours calendaires de Paris. Les commandes annulées ou non payées ne comptent pas.
 */
async function salesStats(producerId: string, days: number) {
  const [daily, top, toPrepare, lowStock] = await Promise.all([
    db.query<{ date: string; revenue: number; orders: number }>(
      `WITH paid AS (
         SELECT o.total_price, (o.created_at AT TIME ZONE 'Europe/Paris')::date AS day
         FROM orders o
         WHERE o.producer_id = $1 AND o.status IN ${PAID_STATUSES}
           AND o.created_at >= NOW() - make_interval(days => $2::int + 1)
       ),
       days AS (
         SELECT generate_series(
           (NOW() AT TIME ZONE 'Europe/Paris')::date - ($2::int - 1),
           (NOW() AT TIME ZONE 'Europe/Paris')::date,
           interval '1 day'
         )::date AS day
       )
       SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(p.total_price), 0)::float AS revenue,
              COUNT(p.total_price)::int AS orders
       FROM days d LEFT JOIN paid p ON p.day = d.day
       GROUP BY d.day ORDER BY d.day`,
      [producerId, days],
    ),
    db.query(
      `SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::int AS quantity,
              SUM(oi.quantity * oi.unit_price)::float AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.producer_id = $1 AND o.status IN ${PAID_STATUSES}
         AND (o.created_at AT TIME ZONE 'Europe/Paris')::date
             > (NOW() AT TIME ZONE 'Europe/Paris')::date - $2::int
       GROUP BY oi.product_id, oi.product_name
       ORDER BY revenue DESC, quantity DESC LIMIT $3`,
      [producerId, days, TOP_PRODUCTS],
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM orders
       WHERE producer_id = $1 AND status IN ('PAID', 'PREPARING')`,
      [producerId],
    ),
    db.query(
      `SELECT id, name, stock, unit FROM products
       WHERE producer_id = $1 AND is_available AND stock <= $2
       ORDER BY stock, name`,
      [producerId, LOW_STOCK_THRESHOLD],
    ),
  ])

  const today = daily.rows[daily.rows.length - 1] ?? { revenue: 0, orders: 0 }
  const revenuePeriod = daily.rows.reduce((sum, d) => sum + d.revenue, 0)
  const ordersPeriod = daily.rows.reduce((sum, d) => sum + d.orders, 0)
  const round2 = (n: number) => Math.round(n * 100) / 100
  return {
    period_days: days,
    revenue_today: round2(today.revenue),
    orders_today: today.orders,
    revenue_period: round2(revenuePeriod),
    orders_period: ordersPeriod,
    average_basket: ordersPeriod ? round2(revenuePeriod / ordersPeriod) : 0,
    orders_to_prepare: toPrepare.rows[0].count,
    low_stock_threshold: LOW_STOCK_THRESHOLD,
    low_stock: lowStock.rows,
    daily: daily.rows,
    top_products: top.rows,
  }
}

/**
 * Newsletter (AI-4) : envoyée en notification aux clients ayant déjà payé une commande
 * chez ce producteur ET ayant accepté les newsletters (opt-in RGPD). Une par 24 h.
 */
async function sendNewsletter(producerId: string, subject: string, body: string) {
  const last = await db.query<{ wait_seconds: number }>(
    `SELECT CEIL(EXTRACT(EPOCH FROM (MAX(sent_at) + make_interval(hours => $2) - NOW())))::int AS wait_seconds
     FROM newsletters WHERE producer_id = $1 HAVING MAX(sent_at) > NOW() - make_interval(hours => $2)`,
    [producerId, NEWSLETTER_COOLDOWN_HOURS],
  )
  if (last.rows[0]) {
    throw new RateLimitError(last.rows[0].wait_seconds, 'Une newsletter a déjà été envoyée ces dernières 24 heures')
  }

  const recipients = await db.query<{ id: string }>(
    `SELECT DISTINCT u.id FROM orders o JOIN users u ON u.id = o.consumer_id
     WHERE o.producer_id = $1 AND o.status IN ${PAID_STATUSES} AND u.newsletter_opt_in AND u.is_active`,
    [producerId],
  )
  const inserted = await db.query(
    `INSERT INTO newsletters (producer_id, subject, body, recipient_count)
     VALUES ($1, $2, $3, $4)
     RETURNING id, subject, body, recipient_count, sent_at`,
    [producerId, subject, body, recipients.rows.length],
  )
  await notify(recipients.rows.map((r) => ({
    userId: r.id,
    type: 'NEWSLETTER' as const,
    title: subject,
    body,
    targetType: 'PRODUCER' as const,
    targetId: producerId,
  })))
  return inserted.rows[0]
}

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

  /** GET /api/producers/me/stats — tableau de bord et statistiques de vente (BO-1, BO-5). */
  .get(
    '/me/stats',
    async ({ user, query }) => salesStats(await findOwnProducerId(user.sub), query.days ?? DEFAULT_STATS_DAYS),
    {
      query: t.Object({ days: t.Optional(t.Integer({ minimum: 1, maximum: 365 })) }),
      detail: { summary: 'Statistiques de vente', tags: ['Producers'] },
    },
  )

  /** GET /api/producers/me/newsletters — newsletters déjà envoyées (AI-4). */
  .get(
    '/me/newsletters',
    async ({ user }) => {
      const producerId = await findOwnProducerId(user.sub)
      const result = await db.query(
        `SELECT id, subject, body, recipient_count, sent_at FROM newsletters
         WHERE producer_id = $1 ORDER BY sent_at DESC LIMIT 50`,
        [producerId],
      )
      return result.rows
    },
    { detail: { summary: 'Mes newsletters', tags: ['Producers'] } },
  )

  /** POST /api/producers/me/newsletters — envoi aux clients abonnés (AI-4). */
  .post(
    '/me/newsletters',
    async ({ user, body, set }) => {
      const producerId = await findOwnProducerId(user.sub)
      const subject = body.subject.trim()
      const content = body.body.trim()
      if (!subject || !content) throw badRequest('Le sujet et le contenu sont obligatoires')
      const newsletter = await sendNewsletter(producerId, subject, content)
      set.status = 201
      return newsletter
    },
    {
      body: t.Object({
        subject: t.String({ minLength: 1, maxLength: 200 }),
        body:    t.String({ minLength: 1, maxLength: 2000 }),
      }),
      detail: { summary: 'Envoyer une newsletter', tags: ['Producers'] },
    },
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
          body.longitude ?? null, body.latitude ?? null, emptyToNull(body.website_url),
          emptyToNull(body.banner_url), body.opening_hours ?? null],
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
