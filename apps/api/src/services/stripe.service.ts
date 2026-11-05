import Stripe from 'stripe'
import { AppError } from '../utils/errors'
import { log } from '../utils/logger'

const STRIPE_API_VERSION = '2024-06-20'

let stripeClient: Stripe | null = null

/** Client Stripe créé à la demande : l'API démarre même sans clé (paiement indisponible → 503). */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key || key.includes('CHANGE_ME')) {
    throw new AppError(503, 'Paiement indisponible : Stripe n\'est pas configuré')
  }
  stripeClient = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  return stripeClient
}

/** Permet aux tests d'injecter un faux client Stripe (frontière du contrat). */
export function setStripeClient(client: Stripe | null) {
  stripeClient = client
}

/** Une erreur réseau ou Stripe devient un 502 explicite plutôt qu'un 500. */
export async function callStripe<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof AppError) throw err
    log.error('stripe call failed', { operation, err })
    throw new AppError(502, 'Le service de paiement n\'a pas répondu, réessayez dans un instant')
  }
}

export type IntentRelease = 'released' | 'already_paid'

/**
 * Libère le PaymentIntent d'une commande non payée qu'on annule. Si le client a déjà
 * validé son paiement (succeeded / processing), on ne peut plus annuler : le webhook
 * va marquer la commande payée.
 */
export async function releasePaymentIntent(intentId: string): Promise<IntentRelease> {
  const stripe = getStripe()
  const intent = await callStripe('paymentIntents.retrieve', () => stripe.paymentIntents.retrieve(intentId))
  if (intent.status === 'succeeded' || intent.status === 'processing') return 'already_paid'
  if (intent.status !== 'canceled') {
    await callStripe('paymentIntents.cancel', () => stripe.paymentIntents.cancel(intentId))
  }
  return 'released'
}

/**
 * Rembourse intégralement le paiement d'une commande. La clé d'idempotence évite un
 * double remboursement si la requête est rejouée (double clic, webhook répété).
 */
export async function refundPayment(orderId: string, intentId: string): Promise<string> {
  const stripe = getStripe()
  const refund = await callStripe('refunds.create', () =>
    stripe.refunds.create(
      { payment_intent: intentId, metadata: { order_id: orderId } },
      { idempotencyKey: `refund-${orderId}` },
    ),
  )
  return refund.id
}
