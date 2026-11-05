import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '../../src/db/client'
import { setGeminiFetch } from '../../src/services/gemini.service'
import { hasTestDatabase } from '../setup'
import { call, createProducerWithProduct, markPaid, placeOrder, registerAccount, resetDatabase } from './helpers'

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

describe.skipIf(!hasTestDatabase)('Agenda producteur (specs/features/agenda.feature)', () => {
  beforeEach(resetDatabase)

  test('le producteur publie un événement ; il apparaît dans l\'agenda public', async () => {
    const { account: producer, producerId } = await createProducerWithProduct()
    const created = await call('POST', '/api/events', {
      token: producer.token,
      body: { title: 'Marché des Arceaux', location: 'Montpellier', starts_at: inDays(2), ends_at: inDays(2.2) },
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ producer_id: producerId, title: 'Marché des Arceaux', producer_city: 'Montpellier' })

    const publicList = await call('GET', `/api/events?producer_id=${producerId}`)
    expect(publicList.body.map((e: { id: string }) => e.id)).toEqual([created.body.id])

    const near = await call('GET', '/api/events?lat=43.62&lon=3.87&radius=10')
    expect(near.body).toHaveLength(1)
    expect((await call('GET', '/api/events?lat=48.85&lon=2.35&radius=10')).body).toHaveLength(0)
  })

  test('les événements passés sont masqués sauf demande ; la fin doit suivre le début', async () => {
    const { account: producer, producerId } = await createProducerWithProduct()
    await call('POST', '/api/events', { token: producer.token, body: { title: 'Ancien marché', starts_at: inDays(-3) } })
    await call('POST', '/api/events', { token: producer.token, body: { title: 'Prochain marché', starts_at: inDays(3) } })

    const upcoming = await call('GET', `/api/events?producer_id=${producerId}`)
    expect(upcoming.body.map((e: { title: string }) => e.title)).toEqual(['Prochain marché'])
    const all = await call('GET', `/api/events?producer_id=${producerId}&include_past=true`)
    expect(all.body).toHaveLength(2)
    expect((await call('GET', '/api/events/mine', { token: producer.token })).body).toHaveLength(2)

    const invalid = await call('POST', '/api/events', {
      token: producer.token, body: { title: 'À l\'envers', starts_at: inDays(2), ends_at: inDays(1) },
    })
    expect(invalid.status).toBe(400)
  })

  test('modification et suppression réservées au propriétaire', async () => {
    const owner = await createProducerWithProduct()
    const other = await createProducerWithProduct()
    const consumer = await registerAccount()
    const event = await call('POST', '/api/events', { token: owner.account.token, body: { title: 'Portes ouvertes', starts_at: inDays(5) } })

    const body = { title: 'Piratage', starts_at: inDays(5) }
    expect((await call('PUT', `/api/events/${event.body.id}`, { token: other.account.token, body })).status).toBe(403)
    expect((await call('POST', '/api/events', { token: consumer.token, body })).status).toBe(403)

    const updated = await call('PUT', `/api/events/${event.body.id}`, {
      token: owner.account.token, body: { title: 'Portes ouvertes de printemps', starts_at: inDays(6), description: 'Visite des serres' },
    })
    expect(updated.body).toMatchObject({ title: 'Portes ouvertes de printemps', description: 'Visite des serres' })
    expect((await call('DELETE', `/api/events/${event.body.id}`, { token: owner.account.token })).status).toBe(204)
    expect((await call('DELETE', `/api/events/${event.body.id}`, { token: owner.account.token })).status).toBe(404)
  })
})

describe.skipIf(!hasTestDatabase)('Statistiques de vente (BO-1, BO-5)', () => {
  beforeEach(resetDatabase)

  test('chiffre du jour, courbe, top produits, stock bas ; commandes non payées exclues', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct(20, 4.5)
    const cheese = await call('POST', '/api/products', {
      token: producer.token, body: { name: 'Pélardon', price: 3, stock: 4, category: 'DAIRY' },
    })
    const consumer = await registerAccount()

    const paid = await placeOrder(consumer, producerId, productId, 2)
    await markPaid(paid.id)
    const paidCheese = await placeOrder(consumer, producerId, cheese.body.id, 1)
    await markPaid(paidCheese.id)
    const old = await placeOrder(consumer, producerId, productId, 1)
    await markPaid(old.id)
    await db.query('UPDATE orders SET created_at = NOW() - interval \'10 days\' WHERE id = $1', [old.id])
    await placeOrder(consumer, producerId, productId, 5) // non payée : ignorée

    const stats = await call('GET', '/api/producers/me/stats?days=7', { token: producer.token })
    expect(stats.status).toBe(200)
    expect(stats.body).toMatchObject({
      period_days: 7,
      revenue_today: 12,
      orders_today: 2,
      revenue_period: 12,
      orders_period: 2,
      average_basket: 6,
      orders_to_prepare: 3,
    })
    expect(stats.body.daily).toHaveLength(7)
    expect(stats.body.top_products[0]).toMatchObject({ product_name: 'Tomates', quantity: 2, revenue: 9 })
    expect(stats.body.low_stock.map((p: { name: string }) => p.name)).toEqual(['Pélardon'])

    expect((await call('GET', '/api/producers/me/stats?days=30', { token: producer.token })).body.orders_period).toBe(3)
    expect((await call('GET', '/api/producers/me/stats', { token: consumer.token })).status).toBe(403)
    expect((await call('GET', '/api/producers/me/stats?days=0', { token: producer.token })).status).toBe(400)
  })
})

describe.skipIf(!hasTestDatabase)('Newsletter (AI-4)', () => {
  beforeEach(resetDatabase)
  afterAll(() => setGeminiFetch(null))

  test('envoyée aux seuls clients abonnés ayant payé ; une par 24 h', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct()
    const subscriber = await registerAccount()
    const notSubscribed = await registerAccount()
    const neverPaid = await registerAccount()
    for (const account of [subscriber, neverPaid]) {
      await call('PATCH', '/api/users/profile', { token: account.token, body: { newsletter_opt_in: true } })
    }
    await markPaid((await placeOrder(subscriber, producerId, productId)).id)
    await markPaid((await placeOrder(notSubscribed, producerId, productId)).id)
    await placeOrder(neverPaid, producerId, productId)

    const sent = await call('POST', '/api/producers/me/newsletters', {
      token: producer.token, body: { subject: 'Les fraises sont là', body: 'Première cueillette samedi.' },
    })
    expect(sent.status).toBe(201)
    expect(sent.body.recipient_count).toBe(1)

    const received = await call('GET', '/api/notifications', { token: subscriber.token })
    expect(received.body.find((n: { type: string }) => n.type === 'NEWSLETTER'))
      .toMatchObject({ title: 'Les fraises sont là', target_type: 'PRODUCER', target_id: producerId })
    expect((await call('GET', '/api/notifications', { token: notSubscribed.token })).body
      .some((n: { type: string }) => n.type === 'NEWSLETTER')).toBe(false)

    const again = await call('POST', '/api/producers/me/newsletters', {
      token: producer.token, body: { subject: 'Encore', body: 'Trop tôt' },
    })
    expect(again.status).toBe(429)
    expect((await call('GET', '/api/producers/me/newsletters', { token: producer.token })).body).toHaveLength(1)
  })

  test('brouillon IA : 503 sans clé, sinon objet et texte issus de Gemini', async () => {
    const { account: producer } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const savedKey = process.env.GEMINI_API_KEY

    delete process.env.GEMINI_API_KEY
    expect((await call('POST', '/api/ai/newsletter', { token: producer.token, body: {} })).status).toBe(503)

    process.env.GEMINI_API_KEY = 'fake-key'
    let sentHeaders: Headers | undefined
    setGeminiFetch(async (_url, init) => {
      sentHeaders = new Headers(init.headers)
      const draft = { subject: 'Tomates de saison', body: 'Nos tomates sont prêtes.' }
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }] })
    })
    const draft = await call('POST', '/api/ai/newsletter', { token: producer.token, body: { tone: 'festif' } })
    expect(draft.status).toBe(200)
    expect(draft.body).toEqual({ subject: 'Tomates de saison', body: 'Nos tomates sont prêtes.' })
    expect(sentHeaders?.get('x-goog-api-key')).toBe('fake-key')

    expect((await call('POST', '/api/ai/newsletter', { token: consumer.token, body: {} })).status).toBe(403)
    process.env.GEMINI_API_KEY = savedKey
  })
})
