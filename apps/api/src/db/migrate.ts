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
import { db, withTransaction, closeDb } from './client'

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  ?? resolve(import.meta.dir, '../../../..', 'infrastructure', 'database', 'migrations')

export async function runMigrations(log: (msg: string) => void = console.log): Promise<string[]> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migration_log (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const applied = await db.query<{ filename: string }>('SELECT filename FROM migration_log')
  const appliedSet = new Set(applied.rows.map((r) => r.filename))

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
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
  runMigrations()
    .then(() => closeDb())
    .catch(async (err) => {
      console.error('[migrate] FAILED', err)
      await closeDb()
      process.exit(1)
    })
}
