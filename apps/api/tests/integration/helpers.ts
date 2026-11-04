import { createApp } from '../../src/app'
import { db } from '../../src/db/client'
import { runMigrations } from '../../src/db/migrate'
import { assertResponseConforms } from '../conformance/spec-contract'

export const app = createApp()

export interface ApiResponse<T = any> {
  status: number
  body: T
}

export async function call<T = any>(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { ...options.headers }
  if (options.token) headers.authorization = `Bearer ${options.token}`
  let payload: string | undefined
  if (options.body !== undefined) {
    headers['content-type'] ??= 'application/json'
    payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  const res = await app.handle(new Request(`http://localhost${path}`, { method, headers, body: payload }))
  const text = await res.text()
  let body: unknown = text
  try { body = text ? JSON.parse(text) : null } catch { /* corps non JSON */ }

  // Contrat : chaque réponse obtenue pendant les tests doit être décrite par specs/api
  assertResponseConforms(method, path, res.status, body)
  return { status: res.status, body: body as T }
}

let isSchemaReady = false

/** Applique les migrations une fois, puis vide toutes les tables métier. */
export async function resetDatabase() {
  if (!isSchemaReady) {
    await runMigrations(() => {})
    isSchemaReady = true
  }
  await db.query(
    'TRUNCATE users, producers, products, orders, order_items, messages, refresh_tokens RESTART IDENTITY CASCADE',
  )
}

let counter = 0

export interface TestAccount {
  id: string
  email: string
  password: string
  token: string
  refreshToken: string
}

export async function registerAccount(role: 'CONSUMER' | 'PRODUCER' = 'CONSUMER'): Promise<TestAccount> {
  counter += 1
  const email = `${role.toLowerCase()}${counter}@test.terraproxi.fr`
  const password = 'motdepasse-solide'
  const res = await call('POST', '/api/auth/register', {
    body: { email, password, first_name: 'Test', last_name: `N${counter}`, role, gdpr_consent: true },
  })
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`)
  return {
    id: res.body.user.id,
    email,
    password,
    token: res.body.access_token,
    refreshToken: res.body.refresh_token,
  }
}

/** Producteur avec profil géolocalisé (Montpellier) et un produit en stock. */
export async function createProducerWithProduct(stock = 10, price = 4.5) {
  const account = await registerAccount('PRODUCER')
  const profile = await call('POST', '/api/producers', {
    token: account.token,
    body: { company_name: `Ferme ${account.email}`, city: 'Montpellier', latitude: 43.6108, longitude: 3.8767 },
  })
  const product = await call('POST', '/api/products', {
    token: account.token,
    body: { name: 'Tomates', price, stock, unit: 'kg', category: 'FRUITS_VEGETABLES' },
  })
  return { account, producerId: profile.body.id as string, productId: product.body.id as string }
}
