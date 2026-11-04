import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '../../src/db/client'
import { hasTestDatabase } from '../setup'
import { call, createProducerWithProduct, registerAccount, resetDatabase } from './helpers'

describe.skipIf(!hasTestDatabase)('Messagerie (specs/features/messaging.feature)', () => {
  beforeEach(resetDatabase)

  test('envoi, boîte de réception, non-lus puis lecture', async () => {
    const { account: producer } = await createProducerWithProduct()
    const consumer = await registerAccount()

    const sent = await call('POST', '/api/messages', {
      token: consumer.token, body: { receiver_id: producer.id, content: '  Bonjour, des tomates samedi ?  ' },
    })
    expect(sent.status).toBe(201)
    expect(sent.body.content).toBe('Bonjour, des tomates samedi ?')
    await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: producer.id, content: 'Merci !' } })

    expect((await call('GET', '/api/messages/unread-count', { token: producer.token })).body.unread_count).toBe(2)

    const inbox = await call('GET', '/api/messages', { token: producer.token })
    expect(inbox.body).toHaveLength(1)
    expect(inbox.body[0]).toMatchObject({ partner_id: consumer.id, last_content: 'Merci !', unread_count: 2 })

    const thread = await call('GET', `/api/messages/${consumer.id}`, { token: producer.token })
    expect(thread.body.map((m: { content: string }) => m.content)).toEqual(['Bonjour, des tomates samedi ?', 'Merci !'])
    expect((await call('GET', '/api/messages/unread-count', { token: producer.token })).body.unread_count).toBe(0)

    const consumerInbox = await call('GET', '/api/messages', { token: consumer.token })
    expect(consumerInbox.body[0].partner_name).toStartWith('Ferme ')
  })

  test('message vide, à soi-même ou à un inconnu → refusé', async () => {
    const consumer = await registerAccount()
    expect((await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: consumer.id, content: 'x' } })).status).toBe(400)
    expect((await call('POST', '/api/messages', {
      token: consumer.token, body: { receiver_id: '00000000-0000-4000-8000-000000000000', content: 'x' },
    })).status).toBe(404)
    expect((await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: consumer.id, content: '   ' } })).status).toBe(400)
  })
})

describe.skipIf(!hasTestDatabase)('RGPD', () => {
  beforeEach(resetDatabase)

  test('export : toutes mes données, en pièce jointe JSON', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    await call('POST', '/api/orders', {
      token: consumer.token, body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })
    await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: producer.id, content: 'Bonjour' } })

    const res = await call('GET', '/api/users/me/export', { token: consumer.token })
    expect(res.status).toBe(200)
    expect(res.body.profile.email).toBe(consumer.email)
    expect(res.body.profile.password_hash).toBeUndefined()
    expect(res.body.orders).toHaveLength(1)
    expect(res.body.orders[0].items[0].product_name).toBe('Tomates')
    expect(res.body.messages).toHaveLength(1)
    expect(res.body.producer).toBeNull()

    const producerExport = await call('GET', '/api/users/me/export', { token: producer.token })
    expect(producerExport.status).toBe(200)
    expect(producerExport.body.producer).toMatchObject({ id: producerId, company_name: expect.any(String) })
  })

  test('droit à l\'oubli : compte, messages et sessions supprimés, commandes anonymisées', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await call('POST', '/api/orders', {
      token: consumer.token, body: { producer_id: producerId, items: [{ product_id: productId, quantity: 2 }] },
    })
    await call('POST', '/api/messages', { token: consumer.token, body: { receiver_id: producer.id, content: 'Bonjour' } })

    const del = await call('DELETE', '/api/users/me', { token: consumer.token })
    expect(del.status).toBe(204)

    const users = await db.query('SELECT 1 FROM users WHERE id = $1', [consumer.id])
    const messages = await db.query('SELECT 1 FROM messages WHERE sender_id = $1 OR receiver_id = $1', [consumer.id])
    const tokens = await db.query('SELECT 1 FROM refresh_tokens WHERE user_id = $1', [consumer.id])
    const orders = await db.query<{ consumer_id: string | null }>('SELECT consumer_id FROM orders WHERE id = $1', [order.body.id])
    expect(users.rowCount).toBe(0)
    expect(messages.rowCount).toBe(0)
    expect(tokens.rowCount).toBe(0)
    expect(orders.rows[0].consumer_id).toBeNull()

    // Le producteur garde sa commande, avec un client anonyme
    const producerOrders = await call('GET', '/api/orders', { token: producer.token })
    expect(producerOrders.body[0].consumer_name).toBe('Client supprimé')

    // Le jeton de l'ancien compte ne donne plus accès au profil
    expect((await call('GET', '/api/users/profile', { token: consumer.token })).status).toBe(404)
  })

  test('suppression d\'un producteur : ses produits disparaissent, les lignes de commande gardent le nom', async () => {
    const { account: producer, producerId, productId } = await createProducerWithProduct()
    const consumer = await registerAccount()
    const order = await call('POST', '/api/orders', {
      token: consumer.token, body: { producer_id: producerId, items: [{ product_id: productId, quantity: 1 }] },
    })

    expect((await call('DELETE', '/api/users/me', { token: producer.token })).status).toBe(204)

    const detail = await call('GET', `/api/orders/${order.body.id}`, { token: consumer.token })
    expect(detail.status).toBe(200)
    expect(detail.body.items[0]).toMatchObject({ product_id: null, product_name: 'Tomates' })
  })
})
