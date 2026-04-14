import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err)
})

export const db = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => pool.query<T>(text, params),

  getClient: () => pool.connect(),
}

export default pool
