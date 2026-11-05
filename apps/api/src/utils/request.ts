/**
 * Adresse IP du client. Derrière Caddy (TRUST_PROXY=true), elle vient de
 * X-Forwarded-For ; sinon de la socket. Sans serveur (tests), 'local'.
 */
type Server = { requestIP: (request: Request) => { address: string } | null } | null | undefined

export function clientIp(request: Request, server?: Server): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return forwarded
  }
  return server?.requestIP(request)?.address ?? 'local'
}

/**
 * Origine publique de l'API pour construire des URL absolues (photos).
 * PUBLIC_API_URL prime ; à défaut, l'origine de la requête (en-têtes du proxy compris).
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.PUBLIC_API_URL?.trim().replace(/\/+$/, '')
  if (configured) return configured
  const url = new URL(request.url)
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host
  return `${proto}://${host}`
}
