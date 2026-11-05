import api from './api'
import type { UserRole } from './auth.service'

/** Schémas de specs/api/admin-api.yaml */
export interface PlatformStats {
  consumers: number
  producers: number
  inactive_users: number
  producers_to_verify: number
  products: number
  paid_orders: number
  paid_revenue: number
  paid_orders_30d: number
}

export interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone: string | null
  is_active: boolean
  created_at: string
  producer_id: string | null
  company_name: string | null
}

export interface AdminProducer {
  id: string
  user_id: string
  company_name: string
  city: string | null
  postal_code: string | null
  website_url: string | null
  is_verified: boolean
  created_at: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  product_count: number
}

export const ADMIN_PAGE_SIZE = 50

export const adminService = {
  stats: () => api.get<PlatformStats>('/admin/stats'),

  users: (params?: { role?: UserRole; search?: string; limit?: number; offset?: number }) =>
    api.get<AdminUser[]>('/admin/users', { params }),

  /** Suspension immédiate (sessions révoquées) ; 400 sur son propre compte. */
  setUserActive: (id: string, is_active: boolean) => api.patch<AdminUser>(`/admin/users/${id}`, { is_active }),

  producers: (params?: { verified?: boolean; limit?: number; offset?: number }) =>
    api.get<AdminProducer[]>('/admin/producers', { params }),

  setProducerVerified: (id: string, is_verified: boolean) =>
    api.patch<AdminProducer>(`/admin/producers/${id}`, { is_verified }),
}
