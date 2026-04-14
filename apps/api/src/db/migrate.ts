/**
 * Script de migration : applique les fichiers SQL du dossier /migrations
 * dans l'ordre alphabétique. Idempotent grâce à la table migration_log.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from './client'

const MIGRATIONS_DIR = join(import.meta.dir, '../../../..',
  'infrastructure', 'database', 'migrations')

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migration_log (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const applied = await db.query<{ filename: string }>(
    'SELECT filename FROM migration_log ORDER BY filename'
  )
  const appliedSet = new Set(applied.rows.map((r) => r.filename))

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`[migrate] skip ${file}`)
      continue
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8')
    console.log(`[migrate] applying ${file}…`)
    await db.query(sql)
    await db.query(
      'INSERT INTO migration_log (filename) VALUES ($1)',
      [file]
    )
    console.log(`[migrate] ✓ ${file}`)
  }

  console.log('[migrate] All migrations applied.')
  process.exit(0)
}

run().catch((err) => {
  console.error('[migrate] FAILED', err)
  process.exit(1)
})
