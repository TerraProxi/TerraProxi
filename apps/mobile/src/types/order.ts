/** specs/schemas/order.schema.json et order-item.schema.json */
export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED'

export interface OrderItem {
  id?: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
}

export interface Order {
  id: string
  consumer_id: string | null
  producer_id: string | null
  status: OrderStatus
  total_price: number
  delivery_mode: 'pickup' | 'delivery'
  delivery_address?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
  producer_name?: string | null
  items?: OrderItem[]
}
