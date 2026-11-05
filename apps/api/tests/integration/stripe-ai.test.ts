import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import type Stripe from 'stripe'
import { db } from '../../src/db/client'
import { setStripeClient } from '../../src/services/stripe.service'
import { hasTestDatabase } from '../setup'
import { call, createProducerWithProduct, registerAccount, resetDatabase } from './helpers'

/** Faux client Stripe à la frontière du contrat (aucun appel réseau). */
function fakeStripe(eventFor: (payload: string) => Stripe.Event) {
  let created = 0
  return {
    paymentIntents: {
      create: async (params: Stripe.PaymentIntentCreateParams) => {
        created += 1
        return { id: `pi_test_${created}`, client_secret: `secret_${created}`, amount: params.amount, status: 'requires_payment_method' }
      },
      retrieve: async (id: string) => ({ id, client_secret: `secret_${id}`, status: 'requires_payment_method' }),
    },
    webhooks: {
      constructEventAsync: async (payload: string, signature: string) => {
        if (signature !== 'valid') throw new Error('bad signature')
        return eventFor(payload)
      },
    },
    get createdCount() { return created },
  }
}

describe.skipIf(!hasTestDatabase)('Paiement Stripe (PAY-1 / PAY-4)', () => {
  const originalKey = process.env.STRIPE_SECRET_KEY
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(async () => {
    await resetDatabase()
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake'
  })
  afterAll(() => {
    process.env.STRIPE_SECRET_KEY = originalKey
    process.env.STRIPE_WEBHOOK_SECRET = originalSecret
    setStripeClient(null)
  })

  test('PaymentIntent en centimes, réutilisé au second appel, webhook signé → PAID', async () => {
    const stripe = fakeStripe((payload) => JSON.parse(payload))
    setStripeClient(stripe as unknown as Stripe)

    const { producerId, productId } = await createProducerWithProduct(10, 4.5)
    const consumer = await registerAccount()
    const order = await call('POST', '/api/orders', {
      token: consumer.token, body: { producer_id: producerId, items: [{ product_id: productId, quantity: 3 }] },
    })

    const intent = await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.body.id } })
    expect(intent.status).toBe(200)
    expect(intent.body.payment_intent_id).toBe('pi_test_1')
    const again = await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.body.id } })
    expect(again.body.payment_intent_id).toBe('pi_test_1')
    expect(stripe.createdCount).toBe(1)

    const event = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_1', metadata: { order_id: order.body.id } } },
    }
    const badSig = await call('POST', '/api/stripe/webhook', { body: event, headers: { 'stripe-signature': 'forged' } })
    expect(badSig.status).toBe(400)

    // Le webhook est public : aucun JWT n'est envoyé
    const hook = await call('POST', '/api/stripe/webhook', { body: event, headers: { 'stripe-signature': 'valid' } })
    expect(hook.status).toBe(200)

    const status = await db.query<{ status: string }>('SELECT status FROM orders WHERE id = $1', [order.body.id])
    expect(status.rows[0].status).toBe('PAID')
  })

  test('webhook pour un intent qui ne correspond pas à la commande → ignoré', async () => {
    setStripeClient(fakeStripe((payload) => JSON.parse(payload)) as unknown as Stripe)
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await call('POST', '/api/orders', {
      token: consumer.token, body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })
    await call('POST', '/api/stripe/webhook', {
      body: { type: 'payment_intent.succeeded', data: { object: { id: 'pi_autre', metadata: { order_id: order.body.id } } } },
      headers: { 'stripe-signature': 'valid' },
    })
    const status = await db.query<{ status: string }>('SELECT status FROM orders WHERE id = $1', [order.body.id])
    expect(status.rows[0].status).toBe('PENDING')
  })

  test('payer la commande d\'un autre → 403 ; Stripe non configuré → 503', async () => {
    setStripeClient(null)
    const { producerId, productId } = await createProducerWithProduct()
    const owner = await registerAccount()
    const other = await registerAccount()
    const order = await call('POST', '/api/orders', {
      token: owner.token, body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })
    expect((await call('POST', '/api/stripe/payment-intent', { token: other.token, body: { order_id: order.body.id } })).status).toBe(403)

    process.env.STRIPE_SECRET_KEY = 'sk_test_CHANGE_ME'
    expect((await call('POST', '/api/stripe/payment-intent', { token: owner.token, body: { order_id: order.body.id } })).status).toBe(503)
  })
})

describe.skipIf(!hasTestDatabase)('Prévisions IA (AI-1)', () => {
  beforeEach(resetDatabase)

  test('réservées au producteur propriétaire', async () => {
    const a = await createProducerWithProduct()
    const b = await createProducerWithProduct()
    const own = await call('GET', `/api/ai/forecast/${a.producerId}`, { token: a.account.token })
    expect(own.status).toBe(200)
    expect(own.body[0]).toMatchObject({ name: 'Tomates', sold_qty: 0, forecast_next_week: 0, confidence: 'LOW' })

    expect((await call('GET', `/api/ai/forecast/${a.producerId}`, { token: b.account.token })).status).toBe(403)
  })
})
