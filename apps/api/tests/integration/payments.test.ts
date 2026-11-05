import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import type Stripe from 'stripe'
import { db } from '../../src/db/client'
import { setStripeClient } from '../../src/services/stripe.service'
import { expireStaleOrders } from '../../src/services/order-lifecycle.service'
import { hasTestDatabase } from '../setup'
import { call, createProducerWithProduct, markPaid, placeOrder, registerAccount, resetDatabase } from './helpers'

type IntentStatus = Stripe.PaymentIntent.Status

/** Faux Stripe à la frontière du contrat : enregistre les annulations et remboursements. */
function fakeStripe() {
  const statuses = new Map<string, IntentStatus>()
  const state = {
    created: 0,
    cancelled: [] as string[],
    refunds: [] as Array<{ payment_intent: string; idempotencyKey?: string }>,
    failNext: false,
    statuses,
  }
  const maybeFail = () => {
    if (state.failNext) {
      state.failNext = false
      throw new Error('stripe down')
    }
  }
  const client = {
    paymentIntents: {
      create: async () => {
        maybeFail()
        state.created += 1
        // Laisse le temps à un second appel concurrent d'attendre le verrou
        await Bun.sleep(30)
        const id = `pi_fake_${state.created}`
        statuses.set(id, 'requires_payment_method')
        return { id, client_secret: `${id}_secret`, status: 'requires_payment_method' }
      },
      retrieve: async (id: string) => {
        maybeFail()
        return { id, client_secret: `${id}_secret`, status: statuses.get(id) ?? 'requires_payment_method' }
      },
      cancel: async (id: string) => {
        maybeFail()
        state.cancelled.push(id)
        statuses.set(id, 'canceled')
        return { id, status: 'canceled' }
      },
    },
    refunds: {
      create: async (params: { payment_intent: string }, options?: { idempotencyKey?: string }) => {
        maybeFail()
        state.refunds.push({ payment_intent: params.payment_intent, idempotencyKey: options?.idempotencyKey })
        return { id: `re_fake_${state.refunds.length}` }
      },
    },
    webhooks: {
      constructEventAsync: async (payload: string, signature: string) => {
        if (signature !== 'valid') throw new Error('bad signature')
        return JSON.parse(payload)
      },
    },
  }
  setStripeClient(client as unknown as Stripe)
  return state
}

const webhook = (type: string, intentId: string, orderId: string) =>
  call('POST', '/api/stripe/webhook', {
    body: { type, data: { object: { id: intentId, metadata: { order_id: orderId } } } },
    headers: { 'stripe-signature': 'valid' },
  })

const orderRow = async (orderId: string) =>
  (await db.query<{ status: string; stripe_refund_id: string | null }>(
    'SELECT status, stripe_refund_id FROM orders WHERE id = $1', [orderId],
  )).rows[0]

const stockOf = async (productId: string) =>
  (await db.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId])).rows[0].stock

describe.skipIf(!hasTestDatabase)('Paiement : annulation, remboursement, expiration (cart-orders.feature)', () => {
  beforeEach(async () => {
    await resetDatabase()
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake'
  })
  afterAll(() => setStripeClient(null))

  test('double clic sur Payer : un seul PaymentIntent pour la commande', async () => {
    const stripe = fakeStripe()
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId)

    const [a, b] = await Promise.all([
      call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.id } }),
      call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.id } }),
    ])
    expect(a.body.payment_intent_id).toBe(b.body.payment_intent_id)
    expect(stripe.created).toBe(1)
  })

  test('le client annule pendant le paiement : l\'intent est annulé chez Stripe, le stock remis', async () => {
    const stripe = fakeStripe()
    const { producerId, productId } = await createProducerWithProduct(10)
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId, 3)
    const intent = await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.id } })

    const cancel = await call('PATCH', `/api/orders/${order.id}/status`, { token: consumer.token, body: { status: 'CANCELLED' } })
    expect(cancel.status).toBe(200)
    expect(stripe.cancelled).toEqual([intent.body.payment_intent_id])
    expect(await stockOf(productId)).toBe(10)
  })

  test('paiement déjà validé chez Stripe : l\'annulation est refusée (409)', async () => {
    const stripe = fakeStripe()
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId)
    const intent = await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.id } })
    stripe.statuses.set(intent.body.payment_intent_id, 'succeeded')

    const cancel = await call('PATCH', `/api/orders/${order.id}/status`, { token: consumer.token, body: { status: 'CANCELLED' } })
    expect(cancel.status).toBe(409)
    expect((await orderRow(order.id)).status).toBe('PENDING')
  })

  test('paiement reçu pour une commande annulée entre-temps : remboursé automatiquement', async () => {
    const stripe = fakeStripe()
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId)
    const intent = await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.id } })
    await db.query('UPDATE orders SET status = \'CANCELLED\' WHERE id = $1', [order.id])

    expect((await webhook('payment_intent.succeeded', intent.body.payment_intent_id, order.id)).status).toBe(200)
    expect(stripe.refunds).toEqual([{ payment_intent: intent.body.payment_intent_id, idempotencyKey: `refund-${order.id}` }])
    expect(await orderRow(order.id)).toMatchObject({ status: 'CANCELLED', stripe_refund_id: 're_fake_1' })

    // Stripe renvoie l'événement : pas de second remboursement
    await webhook('payment_intent.succeeded', intent.body.payment_intent_id, order.id)
    expect(stripe.refunds).toHaveLength(1)
  })

  test('le producteur annule une commande payée : remboursement intégral et stock remis', async () => {
    const stripe = fakeStripe()
    const { account: producer, producerId, productId } = await createProducerWithProduct(10)
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId, 2)
    await markPaid(order.id, 'pi_paid_1')

    const cancel = await call('PATCH', `/api/orders/${order.id}/status`, { token: producer.token, body: { status: 'CANCELLED' } })
    expect(cancel.status).toBe(200)
    expect(stripe.refunds.map((r) => r.payment_intent)).toEqual(['pi_paid_1'])
    expect(await orderRow(order.id)).toMatchObject({ status: 'CANCELLED', stripe_refund_id: 're_fake_1' })
    expect(await stockOf(productId)).toBe(10)
  })

  test('Stripe ne répond pas : 502 et la commande payée reste intacte', async () => {
    const stripe = fakeStripe()
    const { account: producer, producerId, productId } = await createProducerWithProduct(10)
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId, 2)
    await markPaid(order.id)
    stripe.failNext = true

    const cancel = await call('PATCH', `/api/orders/${order.id}/status`, { token: producer.token, body: { status: 'CANCELLED' } })
    expect(cancel.status).toBe(502)
    expect((await orderRow(order.id)).status).toBe('PAID')
    expect(await stockOf(productId)).toBe(8)
  })

  test('commande jamais payée : expirée après le délai, stock libéré, client notifié', async () => {
    const stripe = fakeStripe()
    const { producerId, productId } = await createProducerWithProduct(10)
    const consumer = await registerAccount()
    const stale = await placeOrder(consumer, producerId, productId, 4)
    const recent = await placeOrder(consumer, producerId, productId, 1)
    await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: stale.id } })
    await db.query('UPDATE orders SET created_at = NOW() - interval \'2 hours\' WHERE id = $1', [stale.id])

    expect(await expireStaleOrders(60)).toBe(1)
    expect((await orderRow(stale.id)).status).toBe('CANCELLED')
    expect((await orderRow(recent.id)).status).toBe('PENDING')
    expect(stripe.cancelled).toHaveLength(1)
    expect(await stockOf(productId)).toBe(9)

    const notifications = await call('GET', '/api/notifications', { token: consumer.token })
    expect(notifications.body[0]).toMatchObject({ type: 'ORDER_STATUS', title: 'Commande expirée', target_id: stale.id })
  })

  test('paiement refusé : le client est prévenu, la commande reste payable', async () => {
    fakeStripe()
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId)
    const intent = await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.id } })

    await webhook('payment_intent.payment_failed', intent.body.payment_intent_id, order.id)
    expect((await orderRow(order.id)).status).toBe('PENDING')
    const notifications = await call('GET', '/api/notifications', { token: consumer.token })
    expect(notifications.body[0]).toMatchObject({ type: 'PAYMENT', title: 'Paiement refusé', target_id: order.id })
  })
})
