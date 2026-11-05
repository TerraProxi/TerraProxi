import type { PoolClient } from 'pg'
import { db, withTransaction } from '../db/client'
import type { OrderStatus } from '../models/types'
import { AppError, conflict } from '../utils/errors'
import { log } from '../utils/logger'
import { formatEuros, notify, type NotificationInput } from './notifications.service'
import { refundPayment, releasePaymentIntent } from './stripe.service'

/**
 * Règles transverses du cycle de vie d'une commande : paiement à régler lors d'une
 * annulation, expiration des commandes jamais payées, notifications de statut.
 */
export interface OrderPaymentState {
  id: string
  status: OrderStatus
  stripe_payment_intent: string | null
  stripe_payment_id: string | null
}

export interface OrderSummary {
  id: string
  status: OrderStatus
  consumer_id: string | null
  producer_user_id: string | null
  producer_name: string | null
  consumer_name: string | null
  total_price: number
  delivery_mode: 'pickup' | 'delivery'
  item_count: number
}

const DEFAULT_PENDING_TTL_MINUTES = 60

/** Remet en stock les quantités réservées par une commande annulée. */
export async function restockOrder(client: PoolClient, orderId: string): Promise<void> {
  await client.query(
    `UPDATE products p SET stock = p.stock + oi.quantity
     FROM order_items oi
     WHERE oi.order_id = $1 AND oi.product_id = p.id`,
    [orderId],
  )
}

/**
 * À appeler dans la transaction d'annulation, avant de changer le statut :
 * - commande non payée : le PaymentIntent est annulé chez Stripe (le client ne peut
 *   plus être débité). Si le paiement est déjà validé → 409, le webhook va la payer ;
 * - commande payée : remboursement intégral.
 * Renvoie l'identifiant du remboursement éventuel.
 */
export async function settlePaymentForCancellation(order: OrderPaymentState): Promise<string | null> {
  if (order.status === 'PENDING') {
    if (!order.stripe_payment_intent) return null
    const release = await releasePaymentIntent(order.stripe_payment_intent)
    if (release === 'already_paid') {
      throw conflict('Le paiement de cette commande vient d\'être validé : elle ne peut plus être annulée ainsi')
    }
    return null
  }

  const paidIntent = order.stripe_payment_intent ?? order.stripe_payment_id
  if (!paidIntent) return null
  return refundPayment(order.id, paidIntent)
}

export async function loadOrderSummary(orderId: string): Promise<OrderSummary | null> {
  const result = await db.query<OrderSummary>(
    `SELECT o.id, o.status, o.consumer_id, pr.user_id AS producer_user_id,
            pr.company_name AS producer_name,
            CASE WHEN u.id IS NULL THEN NULL ELSE u.first_name || ' ' || u.last_name END AS consumer_name,
            o.total_price::float AS total_price, o.delivery_mode,
            COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0)::int AS item_count
     FROM orders o
     LEFT JOIN producers pr ON pr.id = o.producer_id
     LEFT JOIN users u ON u.id = o.consumer_id
     WHERE o.id = $1`,
    [orderId],
  )
  return result.rows[0] ?? null
}

/** Notification du consommateur quand le producteur fait avancer ou annule sa commande. */
export function statusNotification(order: OrderSummary, refundId: string | null): NotificationInput | null {
  if (!order.consumer_id) return null
  const producer = order.producer_name ?? 'le producteur'
  const base = { userId: order.consumer_id, type: 'ORDER_STATUS' as const, targetType: 'ORDER' as const, targetId: order.id }

  switch (order.status) {
    case 'PREPARING':
      return { ...base, title: 'Commande en préparation', body: `${producer} prépare votre commande.` }
    case 'READY':
      return {
        ...base,
        title: 'Commande prête',
        body: order.delivery_mode === 'delivery'
          ? `Votre commande chez ${producer} est prête et va vous être livrée.`
          : `Votre commande chez ${producer} est prête : vous pouvez venir la retirer.`,
      }
    case 'CANCELLED':
      return {
        ...base,
        title: 'Commande annulée',
        body: refundId
          ? `${producer} a annulé votre commande. Vous êtes remboursé de ${formatEuros(order.total_price)}.`
          : `Votre commande chez ${producer} a été annulée.`,
      }
    default:
      return null
  }
}

/**
 * Annule une commande encore en attente de paiement (expiration, fermeture de compte).
 * Renvoie false si elle n'est plus annulable (payée entre-temps, déjà traitée).
 */
async function cancelPendingOrder(orderId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const res = await client.query<OrderPaymentState>(
      `SELECT id, status, stripe_payment_intent, stripe_payment_id FROM orders
       WHERE id = $1 AND status = 'PENDING' FOR UPDATE SKIP LOCKED`,
      [orderId],
    )
    const order = res.rows[0]
    if (!order) return false
    if (order.stripe_payment_intent) {
      const release = await releasePaymentIntent(order.stripe_payment_intent)
      if (release === 'already_paid') return false
    }
    await restockOrder(client, orderId)
    await client.query('UPDATE orders SET status = \'CANCELLED\' WHERE id = $1', [orderId])
    return true
  })
}

async function cancelPendingOrders(orderIds: string[], notice: (o: OrderSummary) => NotificationInput | null): Promise<number> {
  let cancelled = 0
  for (const orderId of orderIds) {
    try {
      if (!(await cancelPendingOrder(orderId))) continue
      cancelled += 1
      const summary = await loadOrderSummary(orderId)
      const notification = summary && notice(summary)
      if (notification) await notify(notification)
    } catch (err) {
      // Stripe indisponible : la commande sera retentée au prochain passage
      log.warn('pending order cancellation failed', { order_id: orderId, err })
    }
  }
  return cancelled
}

/**
 * Commandes jamais payées : au-delà de ORDER_PENDING_TTL_MINUTES, elles sont annulées
 * et leur stock libéré (sinon un panier abandonné bloquerait le stock indéfiniment).
 */
export async function expireStaleOrders(
  ttlMinutes = Number(process.env.ORDER_PENDING_TTL_MINUTES ?? DEFAULT_PENDING_TTL_MINUTES),
): Promise<number> {
  const stale = await db.query<{ id: string }>(
    `SELECT id FROM orders
     WHERE status = 'PENDING' AND created_at < NOW() - make_interval(mins => $1)
     ORDER BY created_at LIMIT 200`,
    [ttlMinutes],
  )
  return cancelPendingOrders(stale.rows.map((r) => r.id), (order) => order.consumer_id
    ? {
        userId: order.consumer_id,
        type: 'ORDER_STATUS',
        title: 'Commande expirée',
        body: `Votre commande chez ${order.producer_name ?? 'le producteur'} n'a pas été payée à temps : elle est annulée.`,
        targetType: 'ORDER',
        targetId: order.id,
      }
    : null)
}

/**
 * Avant la suppression d'un compte (droit à l'oubli) :
 * - un producteur ne peut pas partir avec des commandes payées non remises (409) ;
 * - les commandes en attente de paiement sont annulées (stock libéré, paiement bloqué).
 */
export async function closeOrdersBeforeAccountDeletion(userId: string): Promise<void> {
  const active = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM orders o JOIN producers pr ON pr.id = o.producer_id
     WHERE pr.user_id = $1 AND o.status IN ('PAID', 'PREPARING', 'READY')`,
    [userId],
  )
  if (active.rows[0].count > 0) {
    throw new AppError(409, 'Des commandes payées sont en cours : remettez-les ou annulez-les avant de supprimer le compte')
  }

  const pending = await db.query<{ id: string }>(
    `SELECT o.id FROM orders o LEFT JOIN producers pr ON pr.id = o.producer_id
     WHERE o.status = 'PENDING' AND (o.consumer_id = $1 OR pr.user_id = $1)`,
    [userId],
  )
  await cancelPendingOrders(pending.rows.map((r) => r.id), (order) =>
    order.consumer_id && order.consumer_id !== userId
      ? {
          userId: order.consumer_id,
          type: 'ORDER_STATUS',
          title: 'Commande annulée',
          body: `${order.producer_name ?? 'Le producteur'} a fermé son compte : votre commande non payée est annulée.`,
          targetType: 'ORDER',
          targetId: order.id,
        }
      : null)

  const remaining = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM orders o LEFT JOIN producers pr ON pr.id = o.producer_id
     WHERE o.status = 'PENDING' AND (o.consumer_id = $1 OR pr.user_id = $1)`,
    [userId],
  )
  if (remaining.rows[0].count > 0) {
    throw new AppError(409, 'Un paiement est en cours de validation : réessayez dans quelques minutes')
  }
}
