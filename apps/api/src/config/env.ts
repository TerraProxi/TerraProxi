import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const apiRoot = resolve(import.meta.dir, '../..')
const repoRoot = resolve(apiRoot, '../..')

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return

  const content = readFileSync(path, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile(resolve(repoRoot, '.env'))
loadEnvFile(resolve(apiRoot, '.env'))

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env at the repo root (see docs/setup.md).`,
    )
  }
  return value
}
