import api from './api'

export type OrderStatus =
  | 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
}

export interface Order {
  id: string
  consumer_id: string
  producer_id: string
  producer_name?: string
  consumer_name?: string
  status: OrderStatus
  total_price: number
  notes?: string
  items: OrderItem[]
  created_at: string
}

export interface CreateOrderPayload {
  producer_id: string
  items: { product_id: string; quantity: number }[]
  notes?: string
}

export const ordersService = {
  create: (data: CreateOrderPayload) =>
    api.post<Order>('/orders', data),

  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get<Order[]>('/orders', { params }),

  getById: (id: string) =>
    api.get<Order>(`/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<Order>(`/orders/${id}/status`, { status }),

  createPaymentIntent: (order_id: string) =>
    api.post<{ client_secret: string; payment_intent_id: string }>(
      '/stripe/payment-intent',
      { order_id },
    ),
}
