import { Elysia, t } from 'elysia'
import type Stripe from 'stripe'
import { authGuard } from '../middlewares/auth.middleware'
import { db, withTransaction } from '../db/client'
import { AppError, badRequest, forbidden, notFound } from '../utils/errors'
import { log } from '../utils/logger'
import { callStripe, getStripe, refundPayment } from '../services/stripe.service'
import { formatEuros, notify } from '../services/notifications.service'
import { loadOrderSummary } from '../services/order-lifecycle.service'

const CENTS_PER_EURO = 100
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PayableOrder {
  id: string
  consumer_id: string | null
  status: string
  total_price: string
  stripe_payment_intent: string | null
}

/** Commande payée : le producteur doit la préparer, le client reçoit une confirmation. */
async function notifyPaid(orderId: string): Promise<void> {
  const order = await loadOrderSummary(orderId)
  if (!order) return
  const amount = formatEuros(order.total_price)
  await notify([
    ...(order.producer_user_id ? [{
      userId: order.producer_user_id,
      type: 'NEW_ORDER' as const,
      title: 'Nouvelle commande à préparer',
      body: `${order.consumer_name ?? 'Un client'} — ${order.item_count} article(s), ${amount}`,
      targetType: 'ORDER' as const,
      targetId: order.id,
    }] : []),
    ...(order.consumer_id ? [{
      userId: order.consumer_id,
      type: 'PAYMENT' as const,
      title: 'Paiement confirmé',
      body: `Votre commande chez ${order.producer_name ?? 'le producteur'} (${amount}) est payée.`,
      targetType: 'ORDER' as const,
      targetId: order.id,
    }] : []),
  ])
}

/**
 * payment_intent.succeeded : la commande passe en PAID. Si elle a été annulée ou a
 * expiré pendant que le client payait, le paiement est remboursé aussitôt : un client
 * ne doit jamais être débité pour une commande annulée.
 */
async function handlePaymentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  const orderId = intent.metadata?.order_id
  if (!orderId || !UUID_PATTERN.test(orderId)) {
    log.warn('stripe payment without order id', { payment_intent: intent.id })
    return
  }

  const paid = await db.query(
    `UPDATE orders SET status = 'PAID', stripe_payment_id = $1
     WHERE id = $2 AND stripe_payment_intent = $1 AND status = 'PENDING'`,
    [intent.id, orderId],
  )
  if (paid.rowCount) {
    await notifyPaid(orderId)
    return
  }

  const res = await db.query<{ status: string; stripe_refund_id: string | null; consumer_id: string | null }>(
    'SELECT status, stripe_refund_id, consumer_id FROM orders WHERE id = $1 AND stripe_payment_intent = $2',
    [orderId, intent.id],
  )
  const order = res.rows[0]
  if (!order) {
    log.warn('stripe payment for unknown intent', { payment_intent: intent.id, order_id: orderId })
    return
  }
  if (order.status !== 'CANCELLED' || order.stripe_refund_id) return

  const refundId = await refundPayment(orderId, intent.id)
  await db.query(
    'UPDATE orders SET stripe_payment_id = $1, stripe_refund_id = $2 WHERE id = $3',
    [intent.id, refundId, orderId],
  )
  log.warn('payment received for cancelled order, refunded', { order_id: orderId, refund_id: refundId })
  if (order.consumer_id) {
    await notify({
      userId: order.consumer_id,
      type: 'PAYMENT',
      title: 'Paiement remboursé',
      body: 'Votre commande avait été annulée avant la fin du paiement : vous êtes intégralement remboursé.',
      targetType: 'ORDER',
      targetId: orderId,
    })
  }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const res = await db.query<{ id: string; consumer_id: string | null }>(
    `SELECT id, consumer_id FROM orders WHERE stripe_payment_intent = $1 AND status = 'PENDING'`,
    [intent.id],
  )
  const order = res.rows[0]
  if (!order?.consumer_id) return
  await notify({
    userId: order.consumer_id,
    type: 'PAYMENT',
    title: 'Paiement refusé',
    body: 'Le paiement de votre commande n\'a pas abouti. Vous pouvez réessayer depuis vos commandes.',
    targetType: 'ORDER',
    targetId: order.id,
  })
}

export const stripeRoutes = new Elysia({ prefix: '/stripe' })

  /**
   * POST /api/stripe/webhook (PAY-4) — appelé par Stripe, donc sans JWT.
   * La signature est vérifiée sur le corps brut : `parse: 'none'` empêche
   * Elysia de le consommer avant nous. Chaque traitement est idempotent
   * (mises à jour conditionnelles, remboursement avec clé d'idempotence) car
   * Stripe peut renvoyer un même événement.
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

      const intent = event.data.object as Stripe.PaymentIntent
      if (event.type === 'payment_intent.succeeded') await handlePaymentSucceeded(intent)
      else if (event.type === 'payment_intent.payment_failed') await handlePaymentFailed(intent)
      else log.debug('stripe event ignored', { type: event.type })

      return { received: true }
    },
    { parse: 'none', detail: { summary: 'Webhook Stripe', tags: ['Stripe'] } },
  )

  .use(authGuard(['CONSUMER']))

  /**
   * POST /api/stripe/payment-intent (PAY-1) — le montant vient de la commande
   * en base. Le backend ne voit jamais la carte (PCI-DSS, PAY-5). La ligne de la
   * commande est verrouillée : deux appels simultanés (double clic) obtiennent le
   * même PaymentIntent au lieu d'en créer deux.
   */
  .post(
    '/payment-intent',
    async ({ body, user }) => {
      return withTransaction(async (client) => {
        const orderRes = await client.query<PayableOrder>(
          `SELECT id, consumer_id, status, total_price, stripe_payment_intent
           FROM orders WHERE id = $1 FOR UPDATE`,
          [body.order_id],
        )
        const order = orderRes.rows[0]
        if (!order) throw notFound('Commande')
        if (order.consumer_id !== user.sub) throw forbidden()
        if (order.status !== 'PENDING') throw badRequest('Cette commande ne peut plus être payée')

        const stripe = getStripe()
        if (order.stripe_payment_intent) {
          const intentId = order.stripe_payment_intent
          const existing = await callStripe('paymentIntents.retrieve', () => stripe.paymentIntents.retrieve(intentId))
          if (existing.status !== 'canceled') {
            return { client_secret: existing.client_secret, payment_intent_id: existing.id }
          }
        }

        const intent = await callStripe('paymentIntents.create', () => stripe.paymentIntents.create({
          amount: Math.round(Number(order.total_price) * CENTS_PER_EURO),
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
          metadata: { order_id: order.id, consumer_id: user.sub },
        }))

        await client.query('UPDATE orders SET stripe_payment_intent = $1 WHERE id = $2', [intent.id, order.id])
        return { client_secret: intent.client_secret, payment_intent_id: intent.id }
      })
    },
    {
      body: t.Object({ order_id: t.String({ format: 'uuid' }) }),
      detail: { summary: 'Créer un PaymentIntent', tags: ['Stripe'] },
    },
  )
