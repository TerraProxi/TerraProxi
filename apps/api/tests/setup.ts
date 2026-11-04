/**
 * Préchargé par `bun test` (bunfig.toml).
 *
 * Les tests d'intégration vident la base : ils n'utilisent QUE
 * TEST_DATABASE_URL, jamais DATABASE_URL. Sans cette variable ils sont ignorés.
 */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET ??= 'test-only-secret-not-for-production-0123456789'
process.env.JWT_EXPIRES_IN ??= '15m'
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d'

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
} else {
  // Valeur factice : le pool est créé paresseusement, aucune connexion n'est tentée
  process.env.DATABASE_URL = 'postgres://unused:unused@127.0.0.1:1/unused'
}

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL)
