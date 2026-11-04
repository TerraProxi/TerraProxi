import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db, withTransaction } from '../db/client'
import { AppError, badRequest, forbidden, notFound } from '../utils/errors'
import { canTransition, shouldRestock, type OrderActor } from '../services/order-status'
import type { Order, OrderStatus } from '../models/types'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const ORDER_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const
const statusSchema = t.Union(ORDER_STATUSES.map((s) => t.Literal(s)))

const ITEMS_JSON = `COALESCE(json_agg(json_build_object(
    'id', oi.id, 'product_id', oi.product_id, 'product_name', oi.product_name,
    'quantity', oi.quantity, 'unit_price', oi.unit_price::float
  ) ORDER BY oi.product_name) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items`

const ORDER_COLUMNS = `o.id, o.consumer_id, o.producer_id, o.status, o.total_price::float AS total_price,
  o.delivery_mode, o.delivery_address, o.notes, o.stripe_payment_intent, o.created_at, o.updated_at`

async function findProducerId(userId: string): Promise<string | null> {
  const res = await db.query<{ id: string }>('SELECT id FROM producers WHERE user_id = $1', [userId])
  return res.rows[0]?.id ?? null
}

export const ordersRoutes = new Elysia({ prefix: '/orders' })
  .use(authGuard())

  /**
   * POST /api/orders — commande auprès d'un producteur (ORDER-3).
   * Les prix viennent de la base, jamais du client. Le stock est réservé dans la
   * même transaction avec un UPDATE conditionnel : deux commandes simultanées ne
   * peuvent pas vendre la même unité.
   */
  .post(
    '/',
    async ({ body, user, set }) => {
      if (user.role !== 'CONSUMER') throw forbidden()
      const { producer_id, items, notes, delivery_mode = 'pickup', delivery_address } = body
      if (delivery_mode === 'delivery' && !delivery_address?.trim()) {
        throw badRequest('Adresse de livraison requise')
      }

      const quantities = new Map<string, number>()
      for (const item of items) {
        quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + item.quantity)
      }

      const order = await withTransaction(async (client) => {
        let total = 0
        const lines: Array<{ id: string; name: string; price: number; quantity: number }> = []

        // Ordre stable des verrous de ligne : évite les interblocages entre commandes
        for (const [productId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
          const reserved = await client.query<{ id: string; name: string; price: string }>(
            `UPDATE products SET stock = stock - $1
             WHERE id = $2 AND producer_id = $3 AND is_available = true AND stock >= $1
             RETURNING id, name, price`,
            [quantity, productId, producer_id],
          )
          const product = reserved.rows[0]
          if (!product) {
            const exists = await client.query<{ name: string }>(
              'SELECT name FROM products WHERE id = $1 AND producer_id = $2 AND is_available = true',
              [productId, producer_id],
            )
            throw exists.rows[0]
              ? badRequest(`Stock insuffisant pour ${exists.rows[0].name}`)
              : badRequest(`Produit ${productId} indisponible chez ce producteur`)
          }
          const price = Number(product.price)
          total += price * quantity
          lines.push({ id: product.id, name: product.name, price, quantity })
        }

        const orderRes = await client.query<Order>(
          `INSERT INTO orders (consumer_id, producer_id, total_price, notes, delivery_mode, delivery_address)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, consumer_id, producer_id, status, total_price::float AS total_price,
                     delivery_mode, delivery_address, notes, created_at`,
          [user.sub, producer_id, total.toFixed(2), notes?.trim() || null, delivery_mode,
            delivery_mode === 'delivery' ? delivery_address!.trim() : null],
        )
        const created = orderRes.rows[0]

        for (const line of lines) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [created.id, line.id, line.name, line.quantity, line.price],
          )
        }
        return {
          ...created,
          items: lines.map((l) => ({
            product_id: l.id, product_name: l.name, quantity: l.quantity, unit_price: l.price,
          })),
        }
      })

      set.status = 201
      return order
    },
    {
      body: t.Object({
        producer_id:      t.String({ format: 'uuid' }),
        items:            t.Array(t.Object({
          product_id: t.String({ format: 'uuid' }),
          quantity:   t.Integer({ minimum: 1, maximum: 999 }),
        }), { minItems: 1, maxItems: 50 }),
        notes:            t.Optional(t.String({ maxLength: 1000 })),
        delivery_mode:    t.Optional(t.Union([t.Literal('pickup'), t.Literal('delivery')])),
        delivery_address: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: { summary: 'Créer une commande', tags: ['Orders'] },
    },
  )

  /** GET /api/orders — historique consommateur (ORDER-5) ou commandes reçues (ORDER-6). */
  .get(
    '/',
    async ({ user, query }) => {
      const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
      const offset = query.offset ?? 0

      let ownerFilter: string
      let ownerId: string
      if (user.role === 'PRODUCER') {
        const producerId = await findProducerId(user.sub)
        if (!producerId) return []
        ownerFilter = 'o.producer_id = $1'
        ownerId = producerId
      } else {
        ownerFilter = 'o.consumer_id = $1'
        ownerId = user.sub
      }

      const params: unknown[] = [ownerId, limit, offset]
      if (query.status) params.push(query.status)

      const result = await db.query(
        `SELECT ${ORDER_COLUMNS},
                pr.company_name AS producer_name,
                COALESCE(u.first_name || ' ' || u.last_name, 'Client supprimé') AS consumer_name,
                ${ITEMS_JSON}
         FROM orders o
         LEFT JOIN producers pr ON pr.id = o.producer_id
         LEFT JOIN users u ON u.id = o.consumer_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE ${ownerFilter} ${query.status ? 'AND o.status = $4' : ''}
         GROUP BY o.id, pr.company_name, u.first_name, u.last_name
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        params,
      )
      return result.rows
    },
    {
      query: t.Object({
        status: t.Optional(statusSchema),
        limit:  t.Optional(t.Integer({ minimum: 1 })),
        offset: t.Optional(t.Integer({ minimum: 0 })),
      }),
      detail: { summary: 'Liste des commandes', tags: ['Orders'] },
    },
  )

  /** GET /api/orders/:id — réservé au client et au producteur concernés. */
  .get(
    '/:id',
    async ({ params, user }) => {
      const result = await db.query<Order & { producer_user_id: string | null }>(
        `SELECT ${ORDER_COLUMNS}, pr.company_name AS producer_name, pr.user_id AS producer_user_id,
                ${ITEMS_JSON}
         FROM orders o
         LEFT JOIN producers pr ON pr.id = o.producer_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE o.id = $1
         GROUP BY o.id, pr.company_name, pr.user_id`,
        [params.id],
      )
      const order = result.rows[0]
      if (!order) throw notFound('Commande')
      if (order.consumer_id !== user.sub && order.producer_user_id !== user.sub) throw forbidden()

      const { producer_user_id: _owner, ...publicOrder } = order
      return publicOrder
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Détail d\'une commande', tags: ['Orders'] },
    },
  )

  /**
   * PATCH /api/orders/:id/status — avancement par le producteur, annulation par
   * le client tant que la commande n'est pas payée (services/order-status.ts).
   */
  .patch(
    '/:id/status',
    async ({ params, body, user }) => {
      return withTransaction(async (client) => {
        const res = await client.query<{ status: OrderStatus; consumer_id: string | null; producer_user_id: string | null }>(
          `SELECT o.status, o.consumer_id, pr.user_id AS producer_user_id
           FROM orders o LEFT JOIN producers pr ON pr.id = o.producer_id
           WHERE o.id = $1
           FOR UPDATE OF o`,
          [params.id],
        )
        const current = res.rows[0]
        if (!current) throw notFound('Commande')

        let actor: OrderActor
        if (current.producer_user_id === user.sub) actor = 'PRODUCER'
        else if (current.consumer_id === user.sub) actor = 'CONSUMER'
        else throw forbidden()

        if (!canTransition(actor, current.status, body.status)) {
          throw new AppError(409, `Transition ${current.status} → ${body.status} non autorisée`)
        }

        if (shouldRestock(body.status)) {
          await client.query(
            `UPDATE products p SET stock = p.stock + oi.quantity
             FROM order_items oi
             WHERE oi.order_id = $1 AND oi.product_id = p.id`,
            [params.id],
          )
        }

        const updated = await client.query(
          `UPDATE orders o SET status = $1 WHERE o.id = $2 RETURNING ${ORDER_COLUMNS}`,
          [body.status, params.id],
        )
        return updated.rows[0]
      })
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        status: t.Union([
          t.Literal('PREPARING'),
          t.Literal('READY'),
          t.Literal('COMPLETED'),
          t.Literal('CANCELLED'),
        ]),
      }),
      detail: { summary: 'Mettre à jour le statut', tags: ['Orders'] },
    },
  )
