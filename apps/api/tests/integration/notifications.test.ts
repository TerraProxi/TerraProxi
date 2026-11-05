import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import type Stripe from 'stripe'
import { db } from '../../src/db/client'
import { setStripeClient } from '../../src/services/stripe.service'
import { setPushSender, type PushMessage } from '../../src/services/notifications.service'
import { hasTestDatabase } from '../setup'
import { call, createProducerWithProduct, markPaid, placeOrder, registerAccount, resetDatabase } from './helpers'

const PUSH_TOKEN = 'ExponentPushToken[abcdefghijklmnop]'

describe.skipIf(!hasTestDatabase)('Notifications (specs/features/notifications.feature)', () => {
  const pushed: PushMessage[] = []

  beforeEach(async () => {
    await resetDatabase()
    pushed.length = 0
    setPushSender(async (messages) => { pushed.push(...messages) })
  })
  afterAll(() => {
    setPushSender(null)
    setStripeClient(null)
  })

  test('commande payée : le producteur (NEW_ORDER) et le client (PAYMENT) sont notifiés, avec push', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fake'
    setStripeClient({
      paymentIntents: {
        create: async () => ({ id: 'pi_n1', client_secret: 's', status: 'requires_payment_method' }),
        retrieve: async (id: string) => ({ id, client_secret: 's', status: 'requires_payment_method' }),
      },
      webhooks: { constructEventAsync: async (payload: string) => JSON.parse(payload) },
    } as unknown as Stripe)

    const { account: producer, producerId, productId } = await createProducerWithProduct(10, 4.5)
    const consumer = await registerAccount()
    await call('PUT', '/api/users/me/push-token', { token: producer.token, body: { token: PUSH_TOKEN } })
    const order = await placeOrder(consumer, producerId, productId, 2)
    await call('POST', '/api/stripe/payment-intent', { token: consumer.token, body: { order_id: order.id } })

    await call('POST', '/api/stripe/webhook', {
      body: { type: 'payment_intent.succeeded', data: { object: { id: 'pi_n1', metadata: { order_id: order.id } } } },
      headers: { 'stripe-signature': 'valid' },
    })

    const producerNotifications = await call('GET', '/api/notifications', { token: producer.token })
    expect(producerNotifications.body).toHaveLength(1)
    expect(producerNotifications.body[0]).toMatchObject({
      type: 'NEW_ORDER', title: 'Nouvelle commande à préparer', target_type: 'ORDER', target_id: order.id, is_read: false,
    })
    expect(producerNotifications.body[0].body).toContain('2 article(s)')

    const consumerNotifications = await call('GET', '/api/notifications', { token: consumer.token })
    expect(consumerNotifications.body[0]).toMatchObject({ type: 'PAYMENT', title: 'Paiement confirmé' })

    expect(pushed).toHaveLength(1)
    expect(pushed[0]).toMatchObject({ to: PUSH_TOKEN, title: 'Nouvelle commande à préparer', data: { target_id: order.id } })
  })

  test('commande prête : le client est notifié selon le mode de remise', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId)
    await markPaid(order.id)

    for (const status of ['PREPARING', 'READY', 'COMPLETED']) {
      expect((await call('PATCH', `/api/orders/${order.id}/status`, { token: producer.token, body: { status } })).status).toBe(200)
    }
    const list = await call('GET', '/api/notifications', { token: consumer.token })
    expect(list.body.map((n: { title: string }) => n.title)).toEqual(['Commande prête', 'Commande en préparation'])
    expect(list.body[0].body).toContain('vous pouvez venir la retirer')
  })

  test('nouveau message : une seule notification tant que la précédente n\'est pas lue', async () => {
    const { account: producer } = await createProducerWithProduct()
    const consumer = await registerAccount()

    for (const content of ['Bonjour', 'Vous êtes là samedi ?']) {
      await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: producer.id, content } })
    }
    let list = await call('GET', '/api/notifications', { token: producer.token })
    expect(list.body).toHaveLength(1)
    expect(list.body[0]).toMatchObject({ type: 'NEW_MESSAGE', target_type: 'CONVERSATION', target_id: consumer.id, body: 'Bonjour' })

    // Lire la conversation marque la notification comme lue ; le message suivant notifie à nouveau
    await call('GET', `/api/messages/${consumer.id}`, { token: producer.token })
    expect((await call('GET', '/api/notifications/unread-count', { token: producer.token })).body.unread_count).toBe(0)
    await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: producer.id, content: 'Merci' } })
    list = await call('GET', '/api/notifications?unread_only=true', { token: producer.token })
    expect(list.body).toHaveLength(1)
  })

  test('lecture : une par une, toutes, et jamais celles d\'un autre compte', async () => {
    const { account: producer } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const other = await registerAccount('PRODUCER')
    await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: producer.id, content: 'A' } })
    await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: other.id, content: 'B' } })

    const [mine] = (await call('GET', '/api/notifications', { token: producer.token })).body
    expect((await call('PATCH', `/api/notifications/${mine.id}/read`, { token: other.token })).status).toBe(404)
    const read = await call('PATCH', `/api/notifications/${mine.id}/read`, { token: producer.token })
    expect(read.body.is_read).toBe(true)

    expect((await call('GET', '/api/notifications/unread-count', { token: other.token })).body.unread_count).toBe(1)
    expect((await call('POST', '/api/notifications/read-all', { token: other.token })).status).toBe(204)
    expect((await call('GET', '/api/notifications/unread-count', { token: other.token })).body.unread_count).toBe(0)
  })

  test('jeton push : format Expo exigé, retiré avec null, unique par appareil', async () => {
    const a = await registerAccount()
    const b = await registerAccount()
    expect((await call('PUT', '/api/users/me/push-token', { token: a.token, body: { token: 'pas-un-jeton' } })).status).toBe(400)
    expect((await call('PUT', '/api/users/me/push-token', { token: a.token, body: { token: PUSH_TOKEN } })).status).toBe(204)
    // Le même téléphone se connecte avec un autre compte : le jeton change de propriétaire
    await call('PUT', '/api/users/me/push-token', { token: b.token, body: { token: PUSH_TOKEN } })
    const owners = await db.query('SELECT id FROM users WHERE push_token = $1', [PUSH_TOKEN])
    expect(owners.rows.map((r) => r.id)).toEqual([b.id])
    expect((await call('PUT', '/api/users/me/push-token', { token: b.token, body: { token: null } })).status).toBe(204)
  })
})
