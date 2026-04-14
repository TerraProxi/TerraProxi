import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { notFound, forbidden, badRequest } from '../utils/errors'
import type { Order, OrderItem, Product } from '../models/types'

const orderItemSchema = t.Object({
  product_id: t.String(),
  quantity:   t.Integer({ minimum: 1 }),
})

export const ordersRoutes = new Elysia({ prefix: '/orders' })
  .use(authGuard())

  /** POST /api/orders — création d'une commande depuis le panier */
  .post(
    '/',
    async ({ body, user, set }) => {
      const { producer_id, items, notes } = body

      if (!items.length) throw badRequest('La commande doit contenir au moins un article')

      // Vérification stock et calcul du total
      let total = 0
      const enriched: Array<{ product: Product; quantity: number }> = []

      for (const item of items) {
        const res = await db.query<Product>(
          'SELECT * FROM products WHERE id = $1 AND producer_id = $2 AND is_available = true',
          [item.product_id, producer_id],
        )
        const product = res.rows[0]
        if (!product) throw badRequest(`Produit ${item.product_id} indisponible`)
        if (product.stock < item.quantity) {
          throw badRequest(`Stock insuffisant pour ${product.name}`)
        }
        total += Number(product.price) * item.quantity
        enriched.push({ product, quantity: item.quantity })
      }

      // Transaction DB : création commande + lignes + décrément stock
      const client = await db.getClient()
      try {
        await client.query('BEGIN')

        const orderRes = await client.query<Order>(
          `INSERT INTO orders (consumer_id, producer_id, total_price, notes)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.sub, producer_id, total.toFixed(2), notes],
        )
        const order = orderRes.rows[0]

        for (const { product, quantity } of enriched) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [order.id, product.id, quantity, product.price],
          )
          await client.query(
            'UPDATE products SET stock = stock - $1 WHERE id = $2',
            [quantity, product.id],
          )
        }

        await client.query('COMMIT')

        set.status = 201
        return order
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
    {
      body: t.Object({
        producer_id: t.String(),
        items:       t.Array(orderItemSchema, { minItems: 1 }),
        notes:       t.Optional(t.String()),
      }),
      detail: { summary: 'Créer une commande', tags: ['Orders'] },
    },
  )

  /** GET /api/orders — liste selon le rôle (consommateur ou producteur) */
  .get(
    '/',
    async ({ user, query }) => {
      const { status, limit = 20, offset = 0 } = query

      if (user.role === 'CONSUMER') {
        const result = await db.query(
          `SELECT o.*,
                  pr.company_name AS producer_name,
                  json_agg(json_build_object(
                    'id', oi.id, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
                    'product_name', p.name, 'product_id', oi.product_id
                  )) AS items
           FROM orders o
           JOIN producers pr ON pr.id = o.producer_id
           JOIN order_items oi ON oi.order_id = o.id
           JOIN products p ON p.id = oi.product_id
           WHERE o.consumer_id = $1
           ${status ? 'AND o.status = $4' : ''}
           GROUP BY o.id, pr.company_name
           ORDER BY o.created_at DESC
           LIMIT $2 OFFSET $3`,
          status ? [user.sub, limit, offset, status] : [user.sub, limit, offset],
        )
        return result.rows
      }

      // PRODUCER : voir les commandes liées à ses produits
      const producer = await db.query(
        'SELECT id FROM producers WHERE user_id = $1',
        [user.sub],
      )
      if (!producer.rows[0]) return []

      const result = await db.query(
        `SELECT o.*,
                u.first_name || ' ' || u.last_name AS consumer_name,
                json_agg(json_build_object(
                  'id', oi.id, 'quantity', oi.quantity, 'unit_price', oi.unit_price,
                  'product_name', p.name, 'product_id', oi.product_id
                )) AS items
         FROM orders o
         JOIN users u ON u.id = o.consumer_id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE o.producer_id = $1
         ${status ? 'AND o.status = $4' : ''}
         GROUP BY o.id, consumer_name
         ORDER BY o.created_at DESC
         LIMIT $2 OFFSET $3`,
        status
          ? [producer.rows[0].id, limit, offset, status]
          : [producer.rows[0].id, limit, offset],
      )
      return result.rows
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        limit:  t.Optional(t.Number()),
        offset: t.Optional(t.Number()),
      }),
      detail: { summary: 'Liste des commandes', tags: ['Orders'] },
    },
  )

  /** GET /api/orders/:id */
  .get(
    '/:id',
    async ({ params, user }) => {
      const result = await db.query(
        `SELECT o.*,
                json_agg(json_build_object(
                  'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
                  'unit_price', oi.unit_price, 'product_name', p.name
                )) AS items
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         WHERE o.id = $1
         GROUP BY o.id`,
        [params.id],
      )
      const order = result.rows[0]
      if (!order) throw notFound('Commande')

      // Accès uniquement au consommateur concerné ou au producteur
      const producer = await db.query(
        'SELECT id FROM producers WHERE user_id = $1',
        [user.sub],
      )
      const isProducer = producer.rows[0]?.id === order.producer_id
      if (order.consumer_id !== user.sub && !isProducer) throw forbidden()

      return order
    },
    { detail: { summary: 'Détail d\'une commande', tags: ['Orders'] } },
  )

  /** PATCH /api/orders/:id/status — producteur met à jour le statut */
  .patch(
    '/:id/status',
    async ({ params, body, user }) => {
      const producer = await db.query(
        'SELECT id FROM producers WHERE user_id = $1',
        [user.sub],
      )

      const order = await db.query<Order>(
        'SELECT * FROM orders WHERE id = $1',
        [params.id],
      )
      if (!order.rows[0]) throw notFound('Commande')

      const isOwner = producer.rows[0]?.id === order.rows[0].producer_id
      const isConsumer = order.rows[0].consumer_id === user.sub

      // Seul le producteur peut changer le statut ; le consommateur peut annuler
      if (!isOwner && !(isConsumer && body.status === 'CANCELLED')) {
        throw forbidden()
      }

      const result = await db.query<Order>(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [body.status, params.id],
      )
      return result.rows[0]
    },
    {
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
