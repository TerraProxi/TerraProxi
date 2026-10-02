/**
 * EPIC 11 — Assistant IA & extensions ML
 *
 * POST /ai/chat : assistant conversationnel Gemini avec contexte producteurs.
 * GET  /ai/recommendations, /ai/forecast : stubs ML (historique commandes).
 */
import { Elysia, t } from 'elysia'
import { authGuard, optionalAuth } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { fetchProducerCatalog } from '../services/ai-catalog.service'
import { chatWithGemini } from '../services/gemini.service'

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
  .use(optionalAuth)

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
   * GET /api/ai/recommendations
   * Produits recommandés (collaborative filtering simplifié).
   */
  .use(authGuard(['CONSUMER']))
  .get(
    '/recommendations',
    async ({ user }) => {
      const result = await db.query(
        `SELECT p.*, COUNT(oi.id) AS order_count
         FROM products p
         JOIN order_items oi ON oi.product_id = p.id
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'COMPLETED'
           AND p.is_available = true
           AND p.id NOT IN (
             SELECT DISTINCT oi2.product_id
             FROM order_items oi2
             JOIN orders o2 ON o2.id = oi2.order_id
             WHERE o2.consumer_id = $1
           )
         GROUP BY p.id
         ORDER BY order_count DESC
         LIMIT 10`,
        [user.sub],
      )
      return result.rows
    },
    { detail: { summary: 'Recommandations produits', tags: ['AI'] } },
  )

  /**
   * GET /api/ai/forecast/:producerId
   * Prévision de la demande (moyennes historiques).
   */
  .get(
    '/forecast/:producerId',
    async ({ params }) => {
      const result = await db.query(
        `SELECT
           p.id, p.name,
           AVG(oi.quantity) AS avg_weekly_qty,
           COUNT(DISTINCT o.id) AS total_orders,
           MAX(o.created_at) AS last_order_at
         FROM products p
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'COMPLETED'
         WHERE p.producer_id = $1
         GROUP BY p.id, p.name
         ORDER BY total_orders DESC`,
        [params.producerId],
      )
      return result.rows.map((r) => ({
        ...r,
        forecast_next_week: Math.round(Number(r.avg_weekly_qty ?? 0)),
        confidence: r.total_orders >= 10 ? 'HIGH' : r.total_orders >= 3 ? 'MEDIUM' : 'LOW',
      }))
    },
    { detail: { summary: 'Prévision de la demande', tags: ['AI'] } },
  )
