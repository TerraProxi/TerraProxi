import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { authRoutes } from './routes/auth.routes'
import { producersRoutes } from './routes/producers.routes'
import { productsRoutes } from './routes/products.routes'
import { ordersRoutes } from './routes/orders.routes'
import { messagesRoutes } from './routes/messages.routes'
import { stripeRoutes } from './routes/stripe.routes'
import { usersRoutes } from './routes/users.routes'
import { aiRoutes } from './routes/ai.routes'
import { notificationsRoutes } from './routes/notifications.routes'
import { eventsRoutes } from './routes/events.routes'
import { adminRoutes } from './routes/admin.routes'
import { uploadsRoutes } from './routes/uploads.routes'
import { AppError } from './utils/errors'
import { RateLimitError } from './utils/rate-limit'
import { log } from './utils/logger'
import { pingDb } from './db/client'

export const API_VERSION = '1.2.0'

const DEFAULT_PROD_ORIGINS = ['https://app.terraproxi.fr', 'https://terraproxi.fr']
const REQUEST_ID_PATTERN = /^[\w.-]{1,100}$/

function allowedOrigins(): string[] | true {
  if (process.env.NODE_ENV !== 'production') return true
  const fromEnv = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean)
  return fromEnv?.length ? fromEnv : DEFAULT_PROD_ORIGINS
}

/** La documentation interactive n'est pas exposée en production, sauf demande explicite. */
const isSwaggerEnabled = () => process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true'

const isConfigured = (value: string | undefined) => Boolean(value?.trim()) && !value!.includes('CHANGE_ME')

/** Enveloppe d'erreur standard (specs/contracts/error-envelope.schema.json). */
function errorBody(status: number, error: string, details?: unknown) {
  return details === undefined ? { error, status } : { error, status, details }
}

/** Identifiant de corrélation : repris de X-Request-Id s'il est sûr, sinon généré. */
function requestIdOf(request: Request): string {
  const incoming = request.headers.get('x-request-id')
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID()
}

const startedAt = Date.now()
const requestStartedAt = new WeakMap<Request, number>()

async function healthReport() {
  const dbStart = performance.now()
  const isDbUp = await pingDb()
  return {
    status: isDbUp ? 'ok' : 'degraded',
    version: API_VERSION,
    database: isDbUp ? 'up' : 'down',
    db_latency_ms: isDbUp ? Math.round(performance.now() - dbStart) : null,
    uptime_s: Math.round((Date.now() - startedAt) / 1000),
    services: {
      stripe: isConfigured(process.env.STRIPE_SECRET_KEY) && isConfigured(process.env.STRIPE_WEBHOOK_SECRET)
        ? 'configured' : 'missing',
      ai: isConfigured(process.env.GEMINI_API_KEY) ? 'configured' : 'missing',
    },
    timestamp: new Date().toISOString(),
  }
}

export function createApp() {
  return new Elysia()
    .use(cors({ origin: allowedOrigins(), credentials: true, exposeHeaders: ['x-request-id', 'retry-after'] }))

    .use(isSwaggerEnabled()
      ? swagger({
          documentation: {
            info: {
              title: 'TerraProxi API',
              version: API_VERSION,
              description: 'API de la plateforme TerraProxi — vente directe de produits locaux',
            },
            components: {
              securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
              },
            },
            tags: [
              { name: 'Auth',          description: 'Authentification' },
              { name: 'Users',         description: 'Compte utilisateur et RGPD' },
              { name: 'Producers',     description: 'Producteurs géolocalisés, statistiques, newsletters' },
              { name: 'Products',      description: 'Catalogue produits' },
              { name: 'Orders',        description: 'Commandes' },
              { name: 'Messages',      description: 'Messagerie interne' },
              { name: 'Notifications', description: 'Notifications in-app' },
              { name: 'Events',        description: 'Agenda des producteurs' },
              { name: 'Uploads',       description: 'Photos' },
              { name: 'Stripe',        description: 'Paiements Stripe' },
              { name: 'AI',            description: 'Assistant IA Gemini, recommandations, newsletter' },
              { name: 'Admin',         description: 'Administration de la plateforme' },
            ],
          },
        })
      : new Elysia({ name: 'swagger-disabled' }))

    // Journal d'accès structuré, corrélé par X-Request-Id (renvoyé au client)
    .onRequest(({ request, set }) => {
      requestStartedAt.set(request, performance.now())
      set.headers['x-request-id'] = requestIdOf(request)
    })
    .onAfterResponse(({ request, set, path }) => {
      if (path === '/health') return
      const started = requestStartedAt.get(request)
      log.info('request', {
        request_id: set.headers['x-request-id'],
        method: request.method,
        path,
        status: typeof set.status === 'number' ? set.status : 200,
        duration_ms: started === undefined ? null : Math.round(performance.now() - started),
      })
    })

    .onError(({ code, error, set, request, path }) => {
      if (error instanceof RateLimitError) {
        set.headers['retry-after'] = String(Math.max(1, error.retryAfterSeconds))
      }
      if (error instanceof AppError) {
        set.status = error.statusCode
        return errorBody(error.statusCode, error.message)
      }
      if (code === 'VALIDATION') {
        set.status = 400
        const first = error.all?.[0]
        const field = first && 'path' in first ? String(first.path).replace(/^\//, '') : undefined
        return errorBody(400, 'Données invalides', field ? { field, message: first?.summary } : undefined)
      }
      if (code === 'PARSE') {
        set.status = 400
        return errorBody(400, 'Corps de requête illisible')
      }
      if (code === 'NOT_FOUND') {
        set.status = 404
        return errorBody(404, 'Ressource introuvable')
      }

      log.error('unhandled error', {
        request_id: set.headers['x-request-id'],
        method: request.method,
        path,
        err: error,
      })
      set.status = 500
      return errorBody(500, 'Erreur interne du serveur')
    })

    // Healthcheck (Docker, Caddy, deploy.sh, healthcheck.sh) — 503 si PostgreSQL ne répond pas
    .get('/health', async ({ set }) => {
      const report = await healthReport()
      if (report.database === 'down') set.status = 503
      return report
    })

    .group('/api', (api) =>
      api
        .use(authRoutes)
        .use(usersRoutes)
        .use(producersRoutes)
        .use(productsRoutes)
        .use(ordersRoutes)
        .use(messagesRoutes)
        .use(notificationsRoutes)
        .use(eventsRoutes)
        .use(uploadsRoutes)
        .use(stripeRoutes)
        .use(aiRoutes)
        .use(adminRoutes),
    )
}

export type App = ReturnType<typeof createApp>
