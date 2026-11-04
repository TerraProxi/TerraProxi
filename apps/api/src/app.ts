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
import { AppError } from './utils/errors'
import { pingDb } from './db/client'

export const API_VERSION = '1.1.0'

const DEFAULT_PROD_ORIGINS = ['https://app.terraproxi.fr', 'https://terraproxi.fr']

function allowedOrigins(): string[] | true {
  if (process.env.NODE_ENV !== 'production') return true
  const fromEnv = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean)
  return fromEnv?.length ? fromEnv : DEFAULT_PROD_ORIGINS
}

/** Enveloppe d'erreur standard (specs/contracts/error-envelope.schema.json). */
function errorBody(status: number, error: string, details?: unknown) {
  return details === undefined ? { error, status } : { error, status, details }
}

export function createApp() {
  return new Elysia()
    .use(cors({ origin: allowedOrigins(), credentials: true }))

    .use(swagger({
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
          { name: 'Auth',      description: 'Authentification' },
          { name: 'Users',     description: 'Compte utilisateur et RGPD' },
          { name: 'Producers', description: 'Producteurs géolocalisés' },
          { name: 'Products',  description: 'Catalogue produits' },
          { name: 'Orders',    description: 'Commandes' },
          { name: 'Messages',  description: 'Messagerie interne' },
          { name: 'Stripe',    description: 'Paiements Stripe' },
          { name: 'AI',        description: 'Assistant IA Gemini & recommandations' },
        ],
      },
    }))

    .onError(({ code, error, set }) => {
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

      console.error('[API Error]', error)
      set.status = 500
      return errorBody(500, 'Erreur interne du serveur')
    })

    // Healthcheck (Docker, Caddy, deploy.sh) — 503 si PostgreSQL ne répond pas
    .get('/health', async ({ set }) => {
      const isDbUp = await pingDb()
      if (!isDbUp) set.status = 503
      return {
        status: isDbUp ? 'ok' : 'degraded',
        version: API_VERSION,
        database: isDbUp ? 'up' : 'down',
        timestamp: new Date().toISOString(),
      }
    })

    .group('/api', (api) =>
      api
        .use(authRoutes)
        .use(usersRoutes)
        .use(producersRoutes)
        .use(productsRoutes)
        .use(ordersRoutes)
        .use(messagesRoutes)
        .use(stripeRoutes)
        .use(aiRoutes),
    )
}

export type App = ReturnType<typeof createApp>
