/**
 * EPIC 11 — Assistant IA & extensions ML
 *
 * POST /ai/chat : assistant conversationnel Gemini avec contexte producteurs.
 * GET  /ai/recommendations, /ai/forecast : statistiques sur l'historique des commandes.
 */
import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { fetchProducerCatalog } from '../services/ai-catalog.service'
import { chatWithGemini } from '../services/gemini.service'
import { forbidden, notFound } from '../utils/errors'

const RECOMMENDATION_LIMIT = 10
const FORECAST_WEEKS = 8

const chatHistoryItem = t.Object({
  role: t.Union([t.Literal('user'), t.Literal('assistant')]),
  content: t.String({ minLength: 1, maxLength: 4000 }),
})

const cartContextItem = t.Object({
  product_id: t.String({ minLength: 1 }),
  product_name: t.String({ minLength: 1 }),
  quantity: t.Number({ minimum: 1, maximum: 99 }),
  unit: t.String({ minLength: 1 }),
  price: t.Number({ minimum: 0 }),
})

const cartContextGroup = t.Object({
  producer_id: t.String({ minLength: 1 }),
  producer_name: t.String({ minLength: 1 }),
  delivery_mode: t.Union([t.Literal('delivery'), t.Literal('pickup')]),
  items: t.Array(cartContextItem, { maxItems: 30 }),
  subtotal: t.Number({ minimum: 0 }),
})

export const aiRoutes = new Elysia({ prefix: '/ai' })
  .use(authGuard())

  /**
   * POST /api/ai/chat
   * Assistant IA : recherche producteurs, recettes, conseils locaux, panier.
   */
  .post(
    '/chat',
    async ({ body }) => {
      const history = body.history ?? []
      const hasGeo = body.lat !== undefined && body.lon !== undefined

      const { producers, isExpandedRadius } = await fetchProducerCatalog(
        hasGeo
          ? {
            lat: body.lat!,
            lon: body.lon!,
            radiusKm: body.radius_km ?? 50,
          }
          : undefined,
      )

      return chatWithGemini(body.message.trim(), history, producers, {
        isExpandedRadius,
        cart: body.cart_context ?? null,
      })
    },
    {
      body: t.Object({
        message: t.String({ minLength: 1, maxLength: 2000 }),
        history: t.Optional(t.Array(chatHistoryItem, { maxItems: 20 })),
        lat: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
        lon: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
        radius_km: t.Optional(t.Number({ minimum: 1, maximum: 200 })),
        cart_context: t.Optional(t.Object({
          groups: t.Array(cartContextGroup, { maxItems: 10 }),
          total: t.Number({ minimum: 0 }),
          count: t.Number({ minimum: 0 }),
        })),
      }),
      detail: {
        summary: 'Assistant IA conversationnel',
        tags: ['AI'],
        description:
          'Envoie un message à Gemini avec le catalogue des producteurs locaux.',
      },
    },
  )

  /**
   * GET /api/ai/recommendations (AI-2)
   * Produits les plus commandés par les autres clients, que je n'ai jamais achetés.
   */
  .get(
    '/recommendations',
    async ({ user }) => {
      const result = await db.query(
        `SELECT p.id, p.producer_id, p.name, p.description, p.price::float AS price, p.unit,
                p.category, p.image_url, pr.company_name AS producer_name,
                COUNT(oi.id)::int AS order_count
         FROM products p
         JOIN producers pr ON pr.id = p.producer_id
         JOIN order_items oi ON oi.product_id = p.id
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'COMPLETED'
           AND p.is_available = true
           AND NOT EXISTS (
             SELECT 1 FROM order_items oi2
             JOIN orders o2 ON o2.id = oi2.order_id
             WHERE o2.consumer_id = $1 AND oi2.product_id = p.id
           )
         GROUP BY p.id, pr.company_name
         ORDER BY order_count DESC
         LIMIT $2`,
        [user.sub, RECOMMENDATION_LIMIT],
      )
      return result.rows
    },
    { detail: { summary: 'Recommandations produits', tags: ['AI'] } },
  )

  /**
   * GET /api/ai/forecast/:producerId (AI-1) — réservé au producteur concerné.
   * Moyenne mobile des quantités vendues (commandes terminées) sur les
   * FORECAST_WEEKS dernières semaines ; la confiance dépend du nombre de
   * semaines avec des ventes.
   */
  .get(
    '/forecast/:producerId',
    async ({ params, user }) => {
      const owner = await db.query<{ user_id: string }>(
        'SELECT user_id FROM producers WHERE id = $1',
        [params.producerId],
      )
      if (!owner.rows[0]) throw notFound('Producteur')
      if (owner.rows[0].user_id !== user.sub) throw forbidden()

      const result = await db.query<{
        id: string; name: string; unit: string; stock: number; sold_qty: number; weeks_with_sales: number
      }>(
        `SELECT p.id, p.name, p.unit, p.stock,
                COALESCE(SUM(oi.quantity) FILTER (WHERE o.id IS NOT NULL), 0)::int AS sold_qty,
                COUNT(DISTINCT date_trunc('week', o.created_at))::int AS weeks_with_sales
         FROM products p
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id
                           AND o.status = 'COMPLETED'
                           AND o.created_at >= NOW() - make_interval(weeks => $2)
         WHERE p.producer_id = $1
         GROUP BY p.id
         ORDER BY sold_qty DESC, p.name`,
        [params.producerId, FORECAST_WEEKS],
      )
      return result.rows.map((r) => ({
        ...r,
        avg_weekly_qty: Number((r.sold_qty / FORECAST_WEEKS).toFixed(2)),
        forecast_next_week: Math.ceil(r.sold_qty / FORECAST_WEEKS),
        confidence: r.weeks_with_sales >= 6 ? 'HIGH' : r.weeks_with_sales >= 3 ? 'MEDIUM' : 'LOW',
      }))
    },
    {
      params: t.Object({ producerId: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Prévision de la demande', tags: ['AI'] },
    },
  )
