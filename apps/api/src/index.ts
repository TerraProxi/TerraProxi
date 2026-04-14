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
import { isDbAvailable } from './db/client'

const PORT = Number(process.env.API_PORT ?? 3002)

const app = new Elysia()

  .use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://app.terraproxi.fr']
      : true,
    credentials: true,
  }))

  .use(swagger({
    documentation: {
      info: {
        title: 'TerraProxi API',
        version: '1.0.0',
        description: 'API de la plateforme TerraProxi — vente directe de produits locaux',
      },
      tags: [
        { name: 'Auth',      description: 'Authentification' },
        { name: 'Users',     description: 'Gestion des utilisateurs' },
        { name: 'Producers', description: 'Producteurs géolocalisés' },
        { name: 'Products',  description: 'Catalogue produits' },
        { name: 'Orders',    description: 'Commandes' },
        { name: 'Messages',  description: 'Messagerie interne' },
        { name: 'Stripe',    description: 'Paiements Stripe' },
      { name: 'AI',        description: 'Recommandations & prévisions (post-MVP)' },
      ],
    },
  }))

  // Healthcheck (utilisé par Docker et Caddy)
  .get('/health', () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data_source: isDbAvailable() ? 'postgresql' : 'mock',
  }))

  // Routes API v1
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

  // Gestionnaire d'erreurs global
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode
      return { error: error.message, statusCode: error.statusCode }
    }

    console.error('[API Error]', error)
    set.status = 500
    return { error: 'Erreur interne du serveur', statusCode: 500 }
  })

  .listen(PORT)

console.log(`🌱 TerraProxi API démarrée sur http://localhost:${PORT}`)
console.log(`📖 Swagger UI : http://localhost:${PORT}/swagger`)
