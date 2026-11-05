import api from './api'

export type OrderStatus =
  | 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  PENDING:   'En attente de paiement',
  PAID:      'Payée',
  PREPARING: 'En préparation',
  READY:     'Prête',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

/** Étapes du cycle normal, dans l'ordre (specs/schemas/order.schema.json). */
export const ORDER_STEPS: readonly OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED']

export interface OrderItem {
  id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
}

export type DeliveryMode = 'pickup' | 'delivery'

export const DELIVERY_MODE_LABELS: Readonly<Record<DeliveryMode, string>> = {
  pickup:   'Retrait chez le producteur',
  delivery: 'Livraison',
}

export interface Order {
  id: string
  consumer_id: string | null
  producer_id: string | null
  producer_name?: string | null
  consumer_name?: string
  status: OrderStatus
  total_price: number
  notes?: string | null
  delivery_mode: DeliveryMode
  delivery_address?: string | null
  items?: OrderItem[]
  created_at: string
  updated_at?: string
}

export interface CreateOrderPayload {
  producer_id: string
  items: { product_id: string; quantity: number }[]
  notes?: string
  delivery_mode?: DeliveryMode
  delivery_address?: string
}

/** Statuts accessibles par PATCH /orders/{id}/status (PAID est réservé au webhook Stripe). */
export type ManualOrderStatus = Exclude<OrderStatus, 'PENDING' | 'PAID'>

/**
 * Transitions autorisées au producteur — miroir de apps/api/src/services/order-status.ts
 * (l'API répond 409 pour toute autre transition).
 */
export const PRODUCER_TRANSITIONS: Readonly<Record<OrderStatus, readonly ManualOrderStatus[]>> = {
  PENDING:   ['CANCELLED'],
  PAID:      ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY:     ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

export const TRANSITION_ACTION_LABELS: Readonly<Record<ManualOrderStatus, string>> = {
  PREPARING: 'Commencer la préparation',
  READY:     'Marquer comme prête',
  COMPLETED: 'Marquer comme remise',
  CANCELLED: 'Annuler la commande',
}

/** Annulation possible côté client tant que la commande n'est pas payée. */
export const isCancellableByConsumer = (status: OrderStatus) => status === 'PENDING'

export const ORDERS_PAGE_SIZE = 20

export const ordersService = {
  create: (data: CreateOrderPayload) =>
    api.post<Order>('/orders', data),

  list: (params?: { status?: OrderStatus; limit?: number; offset?: number }) =>
    api.get<Order[]>('/orders', { params }),

  getById: (id: string) =>
    api.get<Order>(`/orders/${id}`),

  updateStatus: (id: string, status: ManualOrderStatus) =>
    api.patch<Order>(`/orders/${id}/status`, { status }),

  createPaymentIntent: (order_id: string) =>
    api.post<{ client_secret: string; payment_intent_id: string }>(
      '/stripe/payment-intent',
      { order_id },
    ),
}
