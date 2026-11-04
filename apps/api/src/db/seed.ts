/**
 * Charge le jeu de démonstration (seed-data.ts) dans PostgreSQL.
 *
 *   pnpm db:seed            → base de dev / démo (refuse NODE_ENV=production)
 *   SEED_PASSWORD=...       → mot de passe commun des comptes de démo
 *
 * Idempotent : les identifiants sont des UUID v5 dérivés des identifiants du
 * jeu de données, et chaque insertion utilise ON CONFLICT DO NOTHING.
 */
import type { PoolClient } from 'pg'
import { v5 as uuidv5 } from 'uuid'
import { hashPassword } from '../utils/hash'
import { withTransaction, closeDb } from './client'
import { seedMessages, seedProducers, seedProducts, seedUsers } from './seed-data'

/** Espace de noms fixe → mêmes UUID à chaque exécution. */
const SEED_NAMESPACE = '6f1d3a52-7c1e-4b8f-9a0d-2b5e8c4f1a77'
export const DEFAULT_SEED_PASSWORD = 'TerraProxi2026!'

export const seedId = (legacyId: string) => uuidv5(legacyId, SEED_NAMESPACE)

async function insertUsers(client: PoolClient, passwordHash: string) {
  for (const u of seedUsers) {
    await client.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone,
                          is_active, gdpr_consent, gdpr_consent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $8, $9)
       ON CONFLICT DO NOTHING`,
      [seedId(u.id), u.email.toLowerCase(), passwordHash, u.first_name, u.last_name,
        u.role, u.phone ?? null, u.gdpr_consent_at ?? u.created_at, u.created_at],
    )
  }
}

async function insertProducers(client: PoolClient) {
  for (const p of seedProducers) {
    await client.query(
      `INSERT INTO producers (id, user_id, company_name, description, address, city, postal_code,
                              location, website_url, banner_url, is_verified, opening_hours, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($8, $9), 4326),
               $10, $11, $12, $13, $14)
       ON CONFLICT DO NOTHING`,
      [seedId(p.id), seedId(p.user_id), p.company_name, p.description ?? null, p.address ?? null,
        p.city ?? null, p.postal_code ?? null, p.longitude, p.latitude, p.website_url ?? null,
        p.banner_url ?? null, p.is_verified, 'Mer. et sam. 9 h – 13 h', p.created_at],
    )
  }
}

async function insertProducts(client: PoolClient) {
  for (const p of seedProducts) {
    await client.query(
      `INSERT INTO products (id, producer_id, name, description, price, stock, unit, category,
                             image_url, is_available, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT DO NOTHING`,
      [seedId(p.id), seedId(p.producer_id), p.name, p.description ?? null, p.price, p.stock,
        p.unit, p.category, p.image_url ?? null, p.is_available, p.created_at],
    )
  }
}

async function insertMessages(client: PoolClient) {
  for (const m of seedMessages) {
    await client.query(
      `INSERT INTO messages (id, sender_id, receiver_id, content, is_read, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [seedId(m.id), seedId(m.sender_id), seedId(m.receiver_id), m.content, m.is_read, m.sent_at],
    )
  }
}

/** Quelques commandes terminées : alimentent le tableau de bord et les prévisions. */
async function insertDemoOrders(client: PoolClient) {
  const consumerId = seedId(seedUsers[0].id)
  const producer = seedProducers[0]
  const products = seedProducts.filter((p) => p.producer_id === producer.id).slice(0, 3)

  for (let week = 1; week <= 6; week++) {
    const orderId = seedId(`demo-order-${week}`)
    const createdAt = new Date(Date.now() - week * 7 * 24 * 3600 * 1000).toISOString()
    const lines = products.map((p, i) => ({ p, quantity: ((week + i) % 3) + 1 }))
    const total = lines.reduce((sum, l) => sum + l.p.price * l.quantity, 0)

    const inserted = await client.query(
      `INSERT INTO orders (id, consumer_id, producer_id, status, total_price, created_at)
       VALUES ($1, $2, $3, 'COMPLETED', $4, $5)
       ON CONFLICT DO NOTHING RETURNING id`,
      [orderId, consumerId, seedId(producer.id), total.toFixed(2), createdAt],
    )
    if (!inserted.rowCount) continue

    for (const { p, quantity } of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, seedId(p.id), p.name, quantity, p.price],
      )
    }
  }
}

export async function seedDatabase(password = process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD) {
  const passwordHash = await hashPassword(password)
  await withTransaction(async (client) => {
    await insertUsers(client, passwordHash)
    await insertProducers(client)
    await insertProducts(client)
    await insertMessages(client)
    await insertDemoOrders(client)
  })
}

if (import.meta.main) {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('[seed] Refusé en production (ajoutez --force si c\'est voulu).')
    process.exit(1)
  }
  seedDatabase()
    .then(async () => {
      console.log(`[seed] ${seedUsers.length} comptes, ${seedProducers.length} producteurs, `
        + `${seedProducts.length} produits chargés.`)
      await closeDb()
    })
    .catch(async (err) => {
      console.error('[seed] FAILED', err)
      await closeDb()
      process.exit(1)
    })
}
