import { Elysia, t } from 'elysia'
import Stripe from 'stripe'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { AppError, badRequest, forbidden, notFound } from '../utils/errors'

const STRIPE_API_VERSION = '2024-06-20'
const CENTS_PER_EURO = 100

let stripeClient: Stripe | null = null

/** Client Stripe créé à la demande : l'API démarre même sans clé (paiement indisponible → 503). */
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key || key.includes('CHANGE_ME')) {
    throw new AppError(503, 'Paiement indisponible : Stripe n\'est pas configuré')
  }
  stripeClient ??= new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  return stripeClient
}

/** Permet aux tests d'injecter un faux client Stripe. */
export function setStripeClient(client: Stripe | null) {
  stripeClient = client
}

interface PayableOrder {
  id: string
  consumer_id: string | null
  status: string
  total_price: string
  stripe_payment_intent: string | null
}

export const stripeRoutes = new Elysia({ prefix: '/stripe' })

  /**
   * POST /api/stripe/webhook (PAY-4) — appelé par Stripe, donc sans JWT.
   * La signature est vérifiée sur le corps brut : `parse: 'none'` empêche
   * Elysia de le consommer avant nous.
   */
  .post(
    '/webhook',
    async ({ request }) => {
      const signature = request.headers.get('stripe-signature')
      if (!signature) throw badRequest('Signature manquante')

      const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
      if (!secret) throw new AppError(503, 'Webhook Stripe non configuré')

      let event: Stripe.Event
      try {
        event = await getStripe().webhooks.constructEventAsync(await request.text(), signature, secret)
      } catch (err) {
        if (err instanceof AppError) throw err
        throw badRequest('Signature invalide')
      }

      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent
        await db.query(
          `UPDATE orders SET status = 'PAID', stripe_payment_id = $1
           WHERE id = $2 AND stripe_payment_intent = $1 AND status = 'PENDING'`,
          [intent.id, intent.metadata.order_id],
        )
      }

      return { received: true }
    },
    { parse: 'none', detail: { summary: 'Webhook Stripe', tags: ['Stripe'] } },
  )

  .use(authGuard(['CONSUMER']))

  /**
   * POST /api/stripe/payment-intent (PAY-1) — le montant vient de la commande
   * en base. Le backend ne voit jamais la carte (PCI-DSS, PAY-5). Un intent déjà
   * créé pour la commande est réutilisé.
   */
  .post(
    '/payment-intent',
    async ({ body, user }) => {
      const orderRes = await db.query<PayableOrder>(
        `SELECT id, consumer_id, status, total_price, stripe_payment_intent
         FROM orders WHERE id = $1`,
        [body.order_id],
      )
      const order = orderRes.rows[0]
      if (!order) throw notFound('Commande')
      if (order.consumer_id !== user.sub) throw forbidden()
      if (order.status !== 'PENDING') throw badRequest('Cette commande ne peut plus être payée')

      const stripe = getStripe()
      if (order.stripe_payment_intent) {
        const existing = await stripe.paymentIntents.retrieve(order.stripe_payment_intent)
        if (existing.status !== 'canceled') {
          return { client_secret: existing.client_secret, payment_intent_id: existing.id }
        }
      }

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(Number(order.total_price) * CENTS_PER_EURO),
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        metadata: { order_id: order.id, consumer_id: user.sub },
      })

      await db.query('UPDATE orders SET stripe_payment_intent = $1 WHERE id = $2', [intent.id, order.id])
      return { client_secret: intent.client_secret, payment_intent_id: intent.id }
    },
    {
      body: t.Object({ order_id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Créer un PaymentIntent', tags: ['Stripe'] },
    },
  )
