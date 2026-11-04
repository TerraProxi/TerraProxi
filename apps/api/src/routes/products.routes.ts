import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { forbidden, notFound } from '../utils/errors'
import type { Product } from '../models/types'

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 100

export const PRODUCT_CATEGORIES = [
  'FRUITS_VEGETABLES', 'DAIRY', 'MEAT', 'BEVERAGES',
  'FINE_GROCERY', 'CRAFTS', 'FLOWERS_PLANTS', 'OTHER',
] as const

const categorySchema = t.Union(PRODUCT_CATEGORIES.map((c) => t.Literal(c)))

const PRODUCT_COLUMNS = `
  p.id, p.producer_id, p.name, p.description, p.price::float AS price, p.stock, p.unit,
  p.category, p.image_url, p.is_available, p.created_at, p.updated_at`

const productBody = t.Object({
  name:         t.String({ minLength: 1, maxLength: 255 }),
  description:  t.Optional(t.String({ maxLength: 5000 })),
  price:        t.Number({ minimum: 0, maximum: 100000 }),
  stock:        t.Integer({ minimum: 0 }),
  unit:         t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  category:     t.Optional(categorySchema),
  image_url:    t.Optional(t.String({ maxLength: 500 })),
  is_available: t.Optional(t.Boolean()),
})

async function findOwnProducerId(userId: string): Promise<string> {
  const producer = await db.query<{ id: string }>(
    'SELECT id FROM producers WHERE user_id = $1',
    [userId],
  )
  if (!producer.rows[0]) throw notFound('Profil producteur')
  return producer.rows[0].id
}

async function assertProductOwner(productId: string, userId: string) {
  const product = await db.query<{ user_id: string }>(
    `SELECT pr.user_id FROM products p
     JOIN producers pr ON pr.id = p.producer_id
     WHERE p.id = $1`,
    [productId],
  )
  if (!product.rows[0]) throw notFound('Produit')
  if (product.rows[0].user_id !== userId) throw forbidden()
}

export const productsRoutes = new Elysia({ prefix: '/products' })

  /** GET /api/products — catalogue public (CAT-4) : producteur, catégorie, disponibilité, texte. */
  .get(
    '/',
    async ({ query }) => {
      const conditions: string[] = []
      const params: unknown[] = []
      const add = (sql: (n: number) => string, value: unknown) => {
        params.push(value)
        conditions.push(sql(params.length))
      }

      if (query.producer_id) add((n) => `p.producer_id = $${n}`, query.producer_id)
      if (query.category) add((n) => `p.category = $${n}`, query.category)
      if (query.available !== undefined) add((n) => `p.is_available = $${n}`, query.available)
      if (query.search) {
        add((n) => `(p.name ILIKE $${n} OR p.description ILIKE $${n})`, `%${query.search}%`)
      }

      params.push(Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT), query.offset ?? 0)
      const result = await db.query(
        `SELECT ${PRODUCT_COLUMNS}, pr.company_name AS producer_name
         FROM products p
         JOIN producers pr ON pr.id = p.producer_id
         ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
         ORDER BY p.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )
      return result.rows
    },
    {
      query: t.Object({
        producer_id: t.Optional(t.String({ format: 'uuid' })),
        category:    t.Optional(categorySchema),
        available:   t.Optional(t.BooleanString()),
        limit:       t.Optional(t.Integer({ minimum: 1 })),
        offset:      t.Optional(t.Integer({ minimum: 0 })),
        search:      t.Optional(t.String({ maxLength: 100 })),
      }),
      detail: { summary: 'Catalogue produits', tags: ['Products'] },
    },
  )

  /** GET /api/products/:id — fiche produit (CAT-5). */
  .get(
    '/:id',
    async ({ params }) => {
      const result = await db.query<Product>(
        `SELECT ${PRODUCT_COLUMNS}, pr.company_name AS producer_name, pr.city AS producer_city
         FROM products p
         JOIN producers pr ON pr.id = p.producer_id
         WHERE p.id = $1`,
        [params.id],
      )
      if (!result.rows[0]) throw notFound('Produit')
      return result.rows[0]
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Détail d\'un produit', tags: ['Products'] },
    },
  )

  .use(authGuard(['PRODUCER']))

  /** GET /api/products/mine — catalogue du producteur connecté, produits masqués compris (BO-2). */
  .get(
    '/mine',
    async ({ user }) => {
      const producerId = await findOwnProducerId(user.sub)
      const result = await db.query(
        `SELECT ${PRODUCT_COLUMNS} FROM products p WHERE p.producer_id = $1 ORDER BY p.name`,
        [producerId],
      )
      return result.rows
    },
    { detail: { summary: 'Mon catalogue', tags: ['Products'] } },
  )

  .post(
    '/',
    async ({ body, user, set }) => {
      const producerId = await findOwnProducerId(user.sub)
      const { name, description, price, stock, unit, category, image_url, is_available } = body
      const result = await db.query<Product>(
        `INSERT INTO products AS p
           (producer_id, name, description, price, stock, unit, category, image_url, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${PRODUCT_COLUMNS}`,
        [producerId, name.trim(), description ?? null, price, stock,
          unit ?? 'unité', category ?? 'OTHER', image_url ?? null, is_available ?? true],
      )
      set.status = 201
      return result.rows[0]
    },
    { body: productBody, detail: { summary: 'Créer un produit', tags: ['Products'] } },
  )

  .put(
    '/:id',
    async ({ params, body, user }) => {
      await assertProductOwner(params.id, user.sub)
      const { name, description, price, stock, unit, category, image_url, is_available } = body
      const result = await db.query<Product>(
        `UPDATE products AS p SET
           name = $1, description = $2, price = $3, stock = $4,
           unit = COALESCE($5, p.unit), category = COALESCE($6::product_category, p.category),
           image_url = $7, is_available = COALESCE($8, p.is_available)
         WHERE p.id = $9
         RETURNING ${PRODUCT_COLUMNS}`,
        [name.trim(), description ?? null, price, stock, unit ?? null, category ?? null,
          image_url ?? null, is_available ?? null, params.id],
      )
      return result.rows[0]
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: productBody,
      detail: { summary: 'Modifier un produit', tags: ['Products'] },
    },
  )

  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await assertProductOwner(params.id, user.sub)
      await db.query('DELETE FROM products WHERE id = $1', [params.id])
      set.status = 204
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Supprimer un produit', tags: ['Products'] },
    },
  )
