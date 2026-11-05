import api from './api'
import type { NewsletterDraft } from './ai.service'

export interface Producer {
  id: string
  user_id: string
  company_name: string
  description?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
  website_url?: string | null
  banner_url?: string | null
  opening_hours?: string | null
  is_verified: boolean
  first_name?: string
  last_name?: string
  distance_km?: number | null
}

export interface ProducerInput {
  company_name: string
  description?: string
  address?: string
  city?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  website_url?: string
  banner_url?: string
  opening_hours?: string
}

/** specs/schemas/producer-stats.schema.json */
export interface ProducerStats {
  period_days: number
  revenue_today: number
  orders_today: number
  revenue_period: number
  orders_period: number
  average_basket: number
  orders_to_prepare: number
  low_stock_threshold: number
  low_stock: { id: string; name: string; stock: number; unit: string }[]
  daily: DailyRevenue[]
  top_products: { product_id: string | null; product_name: string; quantity: number; revenue: number }[]
}

export interface DailyRevenue {
  /** Jour calendaire (AAAA-MM-JJ, heure de Paris). */
  date: string
  revenue: number
  orders: number
}

/** specs/schemas/newsletter.schema.json */
export interface Newsletter extends NewsletterDraft {
  id: string
  recipient_count: number
  sent_at: string
}

export interface ProducersQuery {
  lat?: number
  lon?: number
  radius?: number
  limit?: number
  offset?: number
  search?: string
}

export const producersService = {
  list: (query?: ProducersQuery) =>
    api.get<Producer[]>('/producers', { params: query }),

  getById: (id: string) =>
    api.get<Producer>(`/producers/${id}`),

  /** BO-1 / BO-5 — statistiques de vente sur les `days` derniers jours. */
  stats: (days: number) => api.get<ProducerStats>('/producers/me/stats', { params: { days } }),

  newsletters: () => api.get<Newsletter[]>('/producers/me/newsletters'),

  /** 429 si une newsletter est déjà partie ces dernières 24 h. */
  sendNewsletter: (draft: NewsletterDraft) => api.post<Newsletter>('/producers/me/newsletters', draft),

  /** Profil producteur du compte connecté (404 tant qu'il n'est pas créé). */
  me: () => api.get<Producer>('/producers/me'),

  createOrUpdate: (data: ProducerInput) => api.post<Producer>('/producers', data),
}
