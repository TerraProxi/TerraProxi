import { Pool } from 'pg'
import { mockDb, setDbAvailable, isDbAvailable } from './mock'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.query('SELECT 1').then(() => {
  console.log('[DB] PostgreSQL connected')
  setDbAvailable(true)
}).catch(() => {
  console.log('[DB] PostgreSQL unavailable — using mock data')
  setDbAvailable(false)
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err)
  setDbAvailable(false)
})

export const db = {
  query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) => {
    try {
      if (isDbAvailable()) {
        const result = await pool.query<T>(text, params)
        return result
      }
    } catch {
      if (isDbAvailable()) {
        console.warn('[DB] Query failed, falling back to mock')
        setDbAvailable(false)
      }
    }
    return mockDb.query(text, params) as { rows: T[]; rowCount: number }
  },

  getClient: () => {
    if (isDbAvailable()) {
      return pool.connect()
    }
    return mockDb.getClient()
  },
}

export { isDbAvailable }

export default pool
