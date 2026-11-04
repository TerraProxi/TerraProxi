import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '../../src/db/client'
import { hasTestDatabase } from '../setup'
import { call, createProducerWithProduct, registerAccount, resetDatabase } from './helpers'

async function stockOf(productId: string): Promise<number> {
  const res = await db.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId])
  return res.rows[0].stock
}

async function markPaid(orderId: string) {
  await db.query(`UPDATE orders SET status = 'PAID' WHERE id = $1`, [orderId])
}

describe.skipIf(!hasTestDatabase)('Commandes (specs/features/cart-orders.feature)', () => {
  beforeEach(resetDatabase)

  test('création : total calculé côté serveur et stock réservé', async () => {
    const { producerId, productId } = await createProducerWithProduct(10, 4.5)
    const consumer = await registerAccount()

    const res = await call('POST', '/api/orders', {
      token: consumer.token,
      body: { producer_id: producerId, items: [{ product_id: productId, quantity: 3 }] },
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ status: 'PENDING', total_price: 13.5, delivery_mode: 'pickup' })
    expect(res.body.items[0]).toMatchObject({ product_name: 'Tomates', quantity: 3, unit_price: 4.5 })
    expect(await stockOf(productId)).toBe(7)
  })

  test('stock insuffisant → 400, rien n\'est décrémenté', async () => {
    const { producerId, productId } = await createProducerWithProduct(2)
    const consumer = await registerAccount()
    const res = await call('POST', '/api/orders', {
      token: consumer.token,
      body: { producer_id: producerId, items: [{ product_id: productId, quantity: 3 }] },
    })
    expect(res.status).toBe(400)
    expect(await stockOf(productId)).toBe(2)
  })

  test('commandes simultanées : jamais de survente', async () => {
    const { producerId, productId } = await createProducerWithProduct(5)
    const consumers = await Promise.all(Array.from({ length: 8 }, () => registerAccount()))

    const results = await Promise.all(consumers.map((c) => call('POST', '/api/orders', {
      token: c.token,
      body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })))

    expect(results.filter((r) => r.status === 201)).toHaveLength(5)
    expect(results.filter((r) => r.status === 400)).toHaveLength(3)
    expect(await stockOf(productId)).toBe(0)
  })

  test('produit d\'un autre producteur → 400', async () => {
    const a = await createProducerWithProduct()
    const b = await createProducerWithProduct()
    const consumer = await registerAccount()
    const res = await call('POST', '/api/orders', {
      token: consumer.token,
      body: { producer_id: a.producerId, items: [{ product_id: b.productId, quantity: 1 }] },
    })
    expect(res.status).toBe(400)
  })

  test('livraison sans adresse → 400', async () => {
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const res = await call('POST', '/api/orders', {
      token: consumer.token,
      body: { producer_id: producerId, delivery_mode: 'delivery', items: [{ product_id: productId, quantity: 1 }] },
    })
    expect(res.status).toBe(400)
  })

  test('parcours complet PAID → PREPARING → READY → COMPLETED par le producteur', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await call('POST', '/api/orders', {
      token: consumer.token,
      body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })

    // PENDING → PREPARING interdit : seule la confirmation Stripe fait passer à PAID
    const early = await call('PATCH', `/api/orders/${order.body.id}/status`, {
      token: producer.token, body: { status: 'PREPARING' },
    })
    expect(early.status).toBe(409)

    await markPaid(order.body.id)
    for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
      const res = await call('PATCH', `/api/orders/${order.body.id}/status`, {
        token: producer.token, body: { status },
      })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe(status)
    }

    const list = await call('GET', '/api/orders?status=COMPLETED', { token: producer.token })
    expect(list.body).toHaveLength(1)
    expect(list.body[0].consumer_name).toBe('Test ' + list.body[0].consumer_name.split(' ')[1])
  })

  test('annulation par le client : remet le stock ; impossible une fois payée', async () => {
    const { producerId, productId } = await createProducerWithProduct(10)
    const consumer = await registerAccount()
    const create = () => call('POST', '/api/orders', {
      token: consumer.token,
      body: { producer_id: producerId, items: [{ product_id: productId, quantity: 4 }] },
    })

    const pending = await create()
    const cancel = await call('PATCH', `/api/orders/${pending.body.id}/status`, {
      token: consumer.token, body: { status: 'CANCELLED' },
    })
    expect(cancel.status).toBe(200)
    expect(await stockOf(productId)).toBe(10)

    const paid = await create()
    await markPaid(paid.body.id)
    const refused = await call('PATCH', `/api/orders/${paid.body.id}/status`, {
      token: consumer.token, body: { status: 'CANCELLED' },
    })
    expect(refused.status).toBe(409)
  })

  test('un tiers ne voit ni ne modifie la commande', async () => {
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const stranger = await registerAccount()
    const order = await call('POST', '/api/orders', {
      token: consumer.token,
      body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })
    expect((await call('GET', `/api/orders/${order.body.id}`, { token: stranger.token })).status).toBe(403)
    expect((await call('PATCH', `/api/orders/${order.body.id}/status`, {
      token: stranger.token, body: { status: 'CANCELLED' },
    })).status).toBe(403)
    expect((await call('GET', `/api/orders/${order.body.id}`, { token: consumer.token })).status).toBe(200)
  })

  test('un producteur ne peut pas passer commande', async () => {
    const { account, producerId, productId } = await createProducerWithProduct()
    const res = await call('POST', '/api/orders', {
      token: account.token,
      body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })
    expect(res.status).toBe(403)
  })
})
