import { beforeEach, describe, expect, test } from 'bun:test'
import { hasTestDatabase } from '../setup'
import { call, createProducerWithProduct, registerAccount, resetDatabase } from './helpers'

describe.skipIf(!hasTestDatabase)('Producteurs et catalogue', () => {
  beforeEach(resetDatabase)

  test('GET /producers/me → 404 tant que le profil n\'existe pas, puis 201 / 200 (upsert)', async () => {
    const producer = await registerAccount('PRODUCER')
    expect((await call('GET', '/api/producers/me', { token: producer.token })).status).toBe(404)

    const created = await call('POST', '/api/producers', {
      token: producer.token, body: { company_name: 'Mas Test', latitude: 43.6, longitude: 3.88 },
    })
    expect(created.status).toBe(201)

    const updated = await call('POST', '/api/producers', {
      token: producer.token, body: { company_name: 'Mas Test 2', opening_hours: 'Sam. 9 h – 12 h' },
    })
    expect(updated.status).toBe(200)
    expect(updated.body.id).toBe(created.body.id)
    expect(updated.body.latitude).toBeCloseTo(43.6)

    const me = await call('GET', '/api/producers/me', { token: producer.token })
    expect(me.body).toMatchObject({ company_name: 'Mas Test 2', opening_hours: 'Sam. 9 h – 12 h' })
  })

  test('recherche géolocalisée : dans le rayon, hors du rayon, distance triée', async () => {
    const { producerId } = await createProducerWithProduct()

    const near = await call('GET', '/api/producers?lat=43.62&lon=3.87&radius=5')
    expect(near.status).toBe(200)
    expect(near.body.map((p: { id: string }) => p.id)).toContain(producerId)
    expect(near.body[0].distance_km).toBeLessThan(5)

    const far = await call('GET', '/api/producers?lat=48.85&lon=2.35&radius=10')
    expect(far.body).toHaveLength(0)

    expect((await call('GET', '/api/producers?lat=43.6')).status).toBe(400)
  })

  test('CRUD produit réservé au propriétaire', async () => {
    const owner = await createProducerWithProduct()
    const other = await createProducerWithProduct()

    const forbidden = await call('PUT', `/api/products/${owner.productId}`, {
      token: other.account.token, body: { name: 'Piratage', price: 0, stock: 0 },
    })
    expect(forbidden.status).toBe(403)

    const updated = await call('PUT', `/api/products/${owner.productId}`, {
      token: owner.account.token, body: { name: 'Tomates cerises', price: 6, stock: 3, is_available: false },
    })
    expect(updated.status).toBe(200)
    expect(updated.body).toMatchObject({ name: 'Tomates cerises', price: 6, is_available: false })

    const mine = await call('GET', '/api/products/mine', { token: owner.account.token })
    expect(mine.body).toHaveLength(1)

    const publicAvailable = await call('GET', `/api/products?producer_id=${owner.producerId}&available=true`)
    expect(publicAvailable.body).toHaveLength(0)

    expect((await call('DELETE', `/api/products/${owner.productId}`, { token: owner.account.token })).status).toBe(204)
    expect((await call('GET', `/api/products/${owner.productId}`)).status).toBe(404)
  })

  test('catégorie inconnue et identifiant non UUID → 400', async () => {
    expect((await call('GET', '/api/products?category=VOITURES')).status).toBe(400)
    expect((await call('GET', '/api/products/pas-un-uuid')).status).toBe(400)
  })
})
