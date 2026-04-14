import { Elysia, t } from 'elysia'
import Stripe from 'stripe'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { notFound, forbidden, badRequest } from '../utils/errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const stripeRoutes = new Elysia({ prefix: '/stripe' })

  /**
   * POST /api/stripe/payment-intent
   * Crée un PaymentIntent Stripe pour une commande existante.
   * Le backend ne voit jamais les données de carte (PCI-DSS).
   */
  .use(authGuard(['CONSUMER']))
  .post(
    '/payment-intent',
    async ({ body, user }) => {
      const { order_id } = body

      const orderRes = await db.query(
        'SELECT * FROM orders WHERE id = $1',
        [order_id],
      )
      const order = orderRes.rows[0]
      if (!order) throw notFound('Commande')
      if (order.consumer_id !== user.sub) throw forbidden()
      if (order.status !== 'PENDING') {
        throw badRequest('Cette commande ne peut plus être payée')
      }

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(Number(order.total_price) * 100), // centimes
        currency: 'eur',
        metadata: { order_id: order.id, consumer_id: user.sub },
      })

      // Sauvegarder l'ID du PaymentIntent
      await db.query(
        'UPDATE orders SET stripe_payment_intent = $1 WHERE id = $2',
        [intent.id, order_id],
      )

      return {
        client_secret: intent.client_secret,
        payment_intent_id: intent.id,
      }
    },
    {
      body: t.Object({ order_id: t.String() }),
      detail: { summary: 'Créer un PaymentIntent', tags: ['Stripe'] },
    },
  )

  /**
   * POST /api/stripe/webhook
   * Reçoit les événements Stripe (payment_intent.succeeded, etc.)
   * Vérifie la signature du webhook avant tout traitement.
   */
  .post(
    '/webhook',
    async ({ request, set }) => {
      const body = await request.text()
      const sig = request.headers.get('stripe-signature')

      if (!sig) {
        set.status = 400
        return { error: 'Signature manquante' }
      }

      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(
          body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!,
        )
      } catch (err) {
        set.status = 400
        return { error: 'Signature invalide' }
      }

      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent
        const { order_id } = intent.metadata

        await db.query(
          `UPDATE orders
           SET status = 'PAID', stripe_payment_id = $1
           WHERE id = $2 AND status = 'PENDING'`,
          [intent.id, order_id],
        )
      }

      return { received: true }
    },
    { detail: { summary: 'Webhook Stripe', tags: ['Stripe'] } },
  )
