import '../config/env'
import { Pool, type PoolClient, type QueryResultRow } from 'pg'
import { requireEnv } from '../config/env'

/**
 * Pool PostgreSQL unique de l'API.
 *
 * Aucune bascule silencieuse vers des données fictives : si la base est
 * indisponible, l'erreur remonte et /health le signale (503). Les données de
 * démonstration se chargent dans PostgreSQL avec `pnpm db:seed`.
 */
const pool = new Pool({
  connectionString: requireEnv('DATABASE_URL'),
  max: Number(process.env.DB_POOL_MAX ?? 20),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err.message)
})

export const db = {
  query: <T extends QueryResultRow = Record<string, any>>(text: string, params?: unknown[]) =>
    pool.query<T>(text, params as unknown[] | undefined),

  getClient: (): Promise<PoolClient> => pool.connect(),
}

/** Exécute `fn` dans une transaction (BEGIN / COMMIT, ROLLBACK en cas d'erreur). */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** Vérifie que la base répond (utilisé par /health). */
export async function pingDb(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

export async function closeDb(): Promise<void> {
  await pool.end()
}

export default pool
