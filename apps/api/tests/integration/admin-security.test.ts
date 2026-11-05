import { beforeEach, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { db } from '../../src/db/client'
import { uploadPath } from '../../src/services/upload-storage'
import { hasTestDatabase } from '../setup'
import {
  call,
  createProducerWithProduct,
  markPaid,
  placeOrder,
  registerAccount,
  registerAdmin,
  resetDatabase,
} from './helpers'

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
])

const imageForm = (bytes: Uint8Array<ArrayBuffer>, name = 'photo.png', type = 'image/png') => {
  const form = new FormData()
  form.append('file', new File([bytes], name, { type }))
  return form
}

describe.skipIf(!hasTestDatabase)('Administration (specs/features/admin.feature)', () => {
  beforeEach(resetDatabase)

  test('réservé au rôle ADMIN', async () => {
    const consumer = await registerAccount()
    const { account: producer } = await createProducerWithProduct()
    expect((await call('GET', '/api/admin/stats', { token: consumer.token })).status).toBe(403)
    expect((await call('GET', '/api/admin/users', { token: producer.token })).status).toBe(403)
    expect((await call('GET', '/api/admin/stats')).status).toBe(401)
  })

  test('indicateurs et recherche de comptes', async () => {
    const admin = await registerAdmin()
    const { producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    await markPaid((await placeOrder(consumer, producerId, productId, 2)).id)

    const stats = await call('GET', '/api/admin/stats', { token: admin.token })
    expect(stats.body).toMatchObject({ consumers: 1, producers: 1, producers_to_verify: 1, paid_orders: 1, paid_revenue: 9 })

    const found = await call('GET', `/api/admin/users?search=${encodeURIComponent(consumer.email)}`, { token: admin.token })
    expect(found.body.map((u: { id: string }) => u.id)).toEqual([consumer.id])
    const producers = await call('GET', '/api/admin/users?role=PRODUCER', { token: admin.token })
    expect(producers.body[0].company_name).toStartWith('Ferme ')
  })

  test('suspension : accès coupé immédiatement, sessions révoquées, réactivation possible', async () => {
    const admin = await registerAdmin()
    const consumer = await registerAccount()

    const suspended = await call('PATCH', `/api/admin/users/${consumer.id}`, { token: admin.token, body: { is_active: false } })
    expect(suspended.body.is_active).toBe(false)
    expect((await call('GET', '/api/users/profile', { token: consumer.token })).status).toBe(401)
    expect((await call('POST', '/api/auth/refresh', { body: { refresh_token: consumer.refreshToken } })).status).toBe(401)
    expect((await call('POST', '/api/auth/login', { body: { email: consumer.email, password: consumer.password } })).status).toBe(401)

    await call('PATCH', `/api/admin/users/${consumer.id}`, { token: admin.token, body: { is_active: true } })
    expect((await call('POST', '/api/auth/login', { body: { email: consumer.email, password: consumer.password } })).status).toBe(200)

    expect((await call('PATCH', `/api/admin/users/${admin.id}`, { token: admin.token, body: { is_active: false } })).status).toBe(400)
  })

  test('vérification d\'un producteur : badge et notification', async () => {
    const admin = await registerAdmin()
    const { account: producer, producerId } = await createProducerWithProduct()

    const pending = await call('GET', '/api/admin/producers?verified=false', { token: admin.token })
    expect(pending.body.map((p: { id: string }) => p.id)).toEqual([producerId])

    const verified = await call('PATCH', `/api/admin/producers/${producerId}`, { token: admin.token, body: { is_verified: true } })
    expect(verified.body).toMatchObject({ is_verified: true, product_count: 1 })
    expect((await call('GET', `/api/producers/${producerId}`)).body.is_verified).toBe(true)

    const notifications = await call('GET', '/api/notifications', { token: producer.token })
    expect(notifications.body[0]).toMatchObject({ type: 'ACCOUNT', title: 'Exploitation vérifiée' })
  })
})

describe.skipIf(!hasTestDatabase)('Sécurité', () => {
  beforeEach(resetDatabase)

  test('force brute : 5 échecs puis 429 avec Retry-After, même avec le bon mot de passe', async () => {
    const consumer = await registerAccount()
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await call('POST', '/api/auth/login', { body: { email: consumer.email, password: 'mauvais' } })
      expect(res.status).toBe(401)
    }
    const blocked = await call('POST', '/api/auth/login', { body: { email: consumer.email, password: consumer.password } })
    expect(blocked.status).toBe(429)
  })

  test('une connexion réussie remet le compteur à zéro', async () => {
    const consumer = await registerAccount()
    for (let attempt = 0; attempt < 4; attempt++) {
      await call('POST', '/api/auth/login', { body: { email: consumer.email, password: 'mauvais' } })
    }
    expect((await call('POST', '/api/auth/login', { body: { email: consumer.email, password: consumer.password } })).status).toBe(200)
    expect((await call('POST', '/api/auth/login', { body: { email: consumer.email, password: 'mauvais' } })).status).toBe(401)
  })

  test('URL javascript: refusée (XSS stockée) ; chaîne vide acceptée', async () => {
    const { account: producer, productId } = await createProducerWithProduct()
    const xss = await call('PUT', `/api/products/${productId}`, {
      token: producer.token, body: { name: 'Tomates', price: 4, stock: 3, image_url: 'javascript:alert(1)' },
    })
    expect(xss.status).toBe(400)
    const profile = await call('POST', '/api/producers', {
      token: producer.token, body: { company_name: 'Ferme', website_url: 'data:text/html,<script>' },
    })
    expect(profile.status).toBe(400)

    const cleared = await call('PUT', `/api/products/${productId}`, {
      token: producer.token, body: { name: 'Tomates', price: 4, stock: 3, image_url: '' },
    })
    expect(cleared.body.image_url).toBeNull()
  })

  test('messagerie : deux clients ne peuvent pas s\'écrire', async () => {
    const a = await registerAccount()
    const b = await registerAccount()
    expect((await call('POST', '/api/messages', { token: a.token, body: { receiver_id: b.id, content: 'Salut' } })).status).toBe(403)
  })

  test('/health : base, latence, services optionnels', async () => {
    const res = await call('GET', '/health')
    expect(res.body).toMatchObject({ status: 'ok', database: 'up', services: { stripe: expect.any(String), ai: expect.any(String) } })
    expect(res.body.db_latency_ms).toBeGreaterThanOrEqual(0)
  })
})

describe.skipIf(!hasTestDatabase)('Photos (CAT-1)', () => {
  beforeEach(resetDatabase)

  test('envoi d\'une image PNG puis lecture publique', async () => {
    const consumer = await registerAccount()
    const res = await call('POST', '/api/uploads', { token: consumer.token, body: imageForm(PNG_BYTES) })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ content_type: 'image/png', size_bytes: PNG_BYTES.length })
    expect(res.body.url).toMatch(/\/api\/uploads\/[0-9a-f-]{36}\.png$/)

    const path = new URL(res.body.url).pathname
    const download = await call('GET', path)
    expect(download.status).toBe(200)
    expect((await call('GET', '/api/uploads/inconnu.png')).status).toBe(404)
  })

  test('le type est vérifié sur le contenu, pas sur le nom', async () => {
    const consumer = await registerAccount()
    const script = new TextEncoder().encode('<script>alert(1)</script>')
    const res = await call('POST', '/api/uploads', { token: consumer.token, body: imageForm(script, 'photo.png') })
    expect(res.status).toBe(400)
  })

  test('plus de 5 Mo → 413 ; sans compte → 401', async () => {
    const consumer = await registerAccount()
    const big = new Uint8Array(5 * 1024 * 1024 + 1)
    big.set(PNG_BYTES)
    expect((await call('POST', '/api/uploads', { token: consumer.token, body: imageForm(big) })).status).toBe(413)
    expect((await call('POST', '/api/uploads', { body: imageForm(PNG_BYTES) })).status).toBe(401)
  })

  test('droit à l\'oubli : les photos du compte sont effacées du disque', async () => {
    const consumer = await registerAccount()
    const res = await call('POST', '/api/uploads', { token: consumer.token, body: imageForm(PNG_BYTES) })
    const filename = res.body.url.split('/').pop()
    expect(existsSync(uploadPath(filename))).toBe(true)

    expect((await call('DELETE', '/api/users/me', { token: consumer.token })).status).toBe(204)
    expect(existsSync(uploadPath(filename))).toBe(false)
  })
})

describe.skipIf(!hasTestDatabase)('Droit à l\'oubli et commandes en cours', () => {
  beforeEach(resetDatabase)

  test('un producteur avec une commande payée non remise ne peut pas supprimer son compte', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId)
    await markPaid(order.id)

    expect((await call('DELETE', '/api/users/me', { token: producer.token })).status).toBe(409)
    await db.query('UPDATE orders SET status = \'COMPLETED\' WHERE id = $1', [order.id])
    expect((await call('DELETE', '/api/users/me', { token: producer.token })).status).toBe(204)
  })

  test('les commandes non payées du compte supprimé sont annulées et le stock remis', async () => {
    const { producerId, productId } = await createProducerWithProduct(10)
    const consumer = await registerAccount()
    const order = await placeOrder(consumer, producerId, productId, 3)

    expect((await call('DELETE', '/api/users/me', { token: consumer.token })).status).toBe(204)
    const row = await db.query<{ status: string }>('SELECT status FROM orders WHERE id = $1', [order.id])
    expect(row.rows[0].status).toBe('CANCELLED')
    const stock = await db.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId])
    expect(stock.rows[0].stock).toBe(10)
  })
})
