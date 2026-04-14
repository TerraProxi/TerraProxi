import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { notFound, forbidden } from '../utils/errors'
import type { Product } from '../models/types'

const productBody = t.Object({
  name:         t.String({ minLength: 1 }),
  description:  t.Optional(t.String()),
  price:        t.Number({ minimum: 0 }),
  stock:        t.Integer({ minimum: 0 }),
  unit:         t.Optional(t.String()),
  category:     t.Optional(t.String()),
  image_url:    t.Optional(t.String()),
  is_available: t.Optional(t.Boolean()),
})

export const productsRoutes = new Elysia({ prefix: '/products' })

  /** GET /api/products — catalogue public avec filtres */
  .get(
    '/',
    async ({ query }) => {
      const { producer_id, category, available, limit = 40, offset = 0, search } = query

      const conditions: string[] = ['1=1']
      const params: unknown[] = []
      let i = 1

      if (producer_id) { conditions.push(`p.producer_id = $${i++}`); params.push(producer_id) }
      if (category)    { conditions.push(`p.category = $${i++}`);    params.push(category) }
      if (available !== undefined) {
        conditions.push(`p.is_available = $${i++}`)
        params.push(available === 'true' || available === true)
      }
      if (search) {
        conditions.push(`(p.name ILIKE $${i} OR p.description ILIKE $${i})`)
        params.push(`%${search}%`); i++
      }

      params.push(limit, offset)
      const result = await db.query(
        `SELECT p.*, pr.company_name AS producer_name
         FROM products p
         JOIN producers pr ON pr.id = p.producer_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY p.created_at DESC
         LIMIT $${i++} OFFSET $${i}`,
        params,
      )
      return result.rows
    },
    {
      query: t.Object({
        producer_id: t.Optional(t.String()),
        category:    t.Optional(t.String()),
        available:   t.Optional(t.String()),
        limit:       t.Optional(t.Number()),
        offset:      t.Optional(t.Number()),
        search:      t.Optional(t.String()),
      }),
      detail: { summary: 'Catalogue produits', tags: ['Products'] },
    },
  )

  /** GET /api/products/:id */
  .get(
    '/:id',
    async ({ params }) => {
      const result = await db.query<Product>(
        `SELECT p.*, pr.company_name AS producer_name, pr.city AS producer_city
         FROM products p
         JOIN producers pr ON pr.id = p.producer_id
         WHERE p.id = $1`,
        [params.id],
      )
      if (!result.rows[0]) throw notFound('Produit')
      return result.rows[0]
    },
    { detail: { summary: 'Détail d\'un produit', tags: ['Products'] } },
  )

  /** Routes authentifiées PRODUCER */
  .use(authGuard(['PRODUCER']))

  .post(
    '/',
    async ({ body, user, set }) => {
      const producer = await db.query(
        'SELECT id FROM producers WHERE user_id = $1',
        [user.sub],
      )
      if (!producer.rows[0]) throw notFound('Profil producteur')

      const { name, description, price, stock, unit, category, image_url, is_available } = body
      const result = await db.query<Product>(
        `INSERT INTO products
           (producer_id, name, description, price, stock, unit, category, image_url, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [producer.rows[0].id, name, description, price, stock,
          unit ?? 'unité', category ?? 'OTHER', image_url, is_available ?? true],
      )
      set.status = 201
      return result.rows[0]
    },
    { body: productBody, detail: { summary: 'Créer un produit', tags: ['Products'] } },
  )

  .put(
    '/:id',
    async ({ params, body, user }) => {
      const product = await db.query<Product & { user_id: string }>(
        `SELECT p.*, pr.user_id
         FROM products p JOIN producers pr ON pr.id = p.producer_id
         WHERE p.id = $1`,
        [params.id],
      )
      if (!product.rows[0]) throw notFound('Produit')
      if (product.rows[0].user_id !== user.sub) throw forbidden()

      const { name, description, price, stock, unit, category, image_url, is_available } = body
      const result = await db.query<Product>(
        `UPDATE products SET
           name=$1, description=$2, price=$3, stock=$4, unit=$5,
           category=$6, image_url=$7, is_available=$8
         WHERE id=$9 RETURNING *`,
        [name, description, price, stock, unit, category, image_url, is_available, params.id],
      )
      return result.rows[0]
    },
    { body: productBody, detail: { summary: 'Modifier un produit', tags: ['Products'] } },
  )

  .delete(
    '/:id',
    async ({ params, user, set }) => {
      const product = await db.query<{ user_id: string }>(
        `SELECT pr.user_id FROM products p
         JOIN producers pr ON pr.id = p.producer_id
         WHERE p.id = $1`,
        [params.id],
      )
      if (!product.rows[0]) throw notFound('Produit')
      if (product.rows[0].user_id !== user.sub) throw forbidden()

      await db.query('DELETE FROM products WHERE id = $1', [params.id])
      set.status = 204
    },
    { detail: { summary: 'Supprimer un produit', tags: ['Products'] } },
  )
