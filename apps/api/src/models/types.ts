export type UserRole = 'CONSUMER' | 'PRODUCER' | 'ADMIN'

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'

export type ProductCategory =
  | 'FRUITS_VEGETABLES'
  | 'DAIRY'
  | 'MEAT'
  | 'BEVERAGES'
  | 'FINE_GROCERY'
  | 'CRAFTS'
  | 'FLOWERS_PLANTS'
  | 'OTHER'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  gdpr_consent: boolean
  created_at: string
}

export interface Producer {
  id: string
  user_id: string
  company_name: string
  description?: string
  address?: string
  city?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  website_url?: string
  banner_url?: string
  is_verified: boolean
  created_at: string
}

export interface Product {
  id: string
  producer_id: string
  name: string
  description?: string
  price: number
  stock: number
  unit: string
  category: ProductCategory
  image_url?: string
  is_available: boolean
  created_at: string
}

export interface Order {
  id: string
  consumer_id: string
  producer_id: string
  status: OrderStatus
  total_price: number
  stripe_payment_id?: string
  notes?: string
  created_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  product?: Product
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  sent_at: string
}

export interface JwtPayload {
  sub: string
  role: UserRole
  iat?: number
  exp?: number
}
