/**
 * Applique les fichiers SQL de infrastructure/database/migrations dans l'ordre
 * alphabétique, chacun dans sa propre transaction. Idempotent grâce à la table
 * migration_log. Seul mécanisme de création du schéma (le dossier n'est plus
 * monté dans docker-entrypoint-initdb.d).
 *
 * MIGRATIONS_DIR permet de surcharger le dossier (image Docker).
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { db, withTransaction, closeDb, pingDb } from './client'

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  ?? resolve(import.meta.dir, '../../../..', 'infrastructure', 'database', 'migrations')

const DB_WAIT_ATTEMPTS = Number(process.env.DB_WAIT_ATTEMPTS ?? 30)
const DB_WAIT_DELAY_MS = 2_000

/**
 * Au premier démarrage, l'image PostGIS initialise la base puis redémarre le
 * serveur : on attend qu'il accepte les connexions TCP avant de migrer.
 */
export async function waitForDatabase(log: (msg: string) => void = console.log): Promise<void> {
  for (let attempt = 1; attempt <= DB_WAIT_ATTEMPTS; attempt++) {
    if (await pingDb()) return
    log(`[migrate] base indisponible, nouvel essai ${attempt}/${DB_WAIT_ATTEMPTS}…`)
    await Bun.sleep(DB_WAIT_DELAY_MS)
  }
  throw new Error(`PostgreSQL injoignable après ${DB_WAIT_ATTEMPTS} essais`)
}

/**
 * Les bases créées avant ce script (001 joué par docker-entrypoint-initdb.d)
 * ont le schéma mais pas de journal : on marque 001 comme appliquée pour ne
 * pas rejouer ses CREATE TYPE / CREATE TABLE.
 */
async function baselineLegacyDatabase(firstMigration: string | undefined, log: (msg: string) => void) {
  if (!firstMigration) return
  const state = await db.query<{ logged: number; has_users: boolean }>(
    `SELECT (SELECT COUNT(*)::int FROM migration_log) AS logged,
            to_regclass('public.users') IS NOT NULL AS has_users`,
  )
  const { logged, has_users } = state.rows[0]
  if (logged === 0 && has_users) {
    await db.query('INSERT INTO migration_log (filename) VALUES ($1)', [firstMigration])
    log(`[migrate] base existante détectée : ${firstMigration} marquée comme appliquée`)
  }
}

export async function runMigrations(log: (msg: string) => void = console.log): Promise<string[]> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migration_log (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  await baselineLegacyDatabase(files[0], log)

  const applied = await db.query<{ filename: string }>('SELECT filename FROM migration_log')
  const appliedSet = new Set(applied.rows.map((r) => r.filename))
  const newlyApplied: string[] = []

  for (const file of files) {
    if (appliedSet.has(file)) continue
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')
    log(`[migrate] applying ${file}…`)
    await withTransaction(async (client) => {
      await client.query(sql)
      await client.query('INSERT INTO migration_log (filename) VALUES ($1)', [file])
    })
    newlyApplied.push(file)
  }

  log(`[migrate] ${newlyApplied.length} migration(s) appliquée(s), schéma à jour.`)
  return newlyApplied
}

if (import.meta.main) {
  waitForDatabase()
    .then(() => runMigrations())
    .then(() => closeDb())
    .catch(async (err) => {
      console.error('[migrate] FAILED', err)
      await closeDb()
      process.exit(1)
    })
}
