/**
 * Journal structuré : une ligne JSON par événement (lisible par `docker compose logs`,
 * Loki, Datadog…). Jamais de mot de passe, de jeton ni de donnée de carte dans `fields`.
 *
 * LOG_LEVEL : debug | info | warn | error | silent (défaut : info, silent en test).
 */
type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<Level | 'silent', number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 }

function threshold(): number {
  const fallback = process.env.NODE_ENV === 'test' ? 'silent' : 'info'
  const configured = (process.env.LOG_LEVEL ?? fallback) as Level | 'silent'
  return LEVEL_ORDER[configured] ?? LEVEL_ORDER.info
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) return { error: err.message, error_name: err.name, stack: err.stack }
  return { error: String(err) }
}

function write(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  if (LEVEL_ORDER[level] < threshold()) return
  const { err, ...rest } = fields
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...rest,
    ...(err === undefined ? {} : serializeError(err)),
  })
  if (level === 'error' || level === 'warn') console.error(line)
  else console.log(line)
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
}
