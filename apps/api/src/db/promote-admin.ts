/**
 * Donne le rôle ADMIN à un compte existant (le rôle ne s'obtient pas à l'inscription).
 *
 *   pnpm --filter @terraproxi/api db:promote-admin prenom.nom@exemple.fr
 *   docker compose exec back bun dist/db/promote-admin.js prenom.nom@exemple.fr   (production)
 */
import { closeDb, db } from './client'

async function promote(email: string): Promise<void> {
  const result = await db.query<{ id: string }>(
    `UPDATE users SET role = 'ADMIN' WHERE email = $1 RETURNING id`,
    [email.trim().toLowerCase()],
  )
  if (!result.rows[0]) throw new Error(`Aucun compte pour ${email}`)
  console.log(`[promote-admin] ${email} est maintenant administrateur.`)
}

if (import.meta.main) {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage : bun run src/db/promote-admin.ts <email>')
    process.exit(1)
  }
  promote(email)
    .then(() => closeDb())
    .catch(async (err) => {
      console.error('[promote-admin] FAILED', err instanceof Error ? err.message : err)
      await closeDb()
      process.exit(1)
    })
}
