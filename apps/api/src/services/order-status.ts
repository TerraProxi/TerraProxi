import type { OrderStatus } from '../models/types'

/**
 * Cycle de vie d'une commande (ORDER-4, specs/features/cart-orders.feature) :
 *
 *   PENDING ──(webhook Stripe)──▶ PAID ──▶ PREPARING ──▶ READY ──▶ COMPLETED
 *      │                           │           │
 *      └──────────────▶ CANCELLED ◀┴───────────┘
 *
 * PENDING → PAID n'est jamais demandé par un utilisateur : seul le webhook
 * Stripe le fait, après vérification de la signature.
 */
export type OrderActor = 'CONSUMER' | 'PRODUCER'

const PRODUCER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING:   ['CANCELLED'],
  PAID:      ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY:     ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

/** Le consommateur ne peut annuler qu'une commande pas encore payée. */
const CONSUMER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING:   ['CANCELLED'],
  PAID:      [],
  PREPARING: [],
  READY:     [],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransition(actor: OrderActor, from: OrderStatus, to: OrderStatus): boolean {
  const table = actor === 'PRODUCER' ? PRODUCER_TRANSITIONS : CONSUMER_TRANSITIONS
  return table[from].includes(to)
}

/** Une annulation remet en stock les quantités réservées à la création. */
export const shouldRestock = (to: OrderStatus) => to === 'CANCELLED'
