import api from './api'

export interface ForecastLine {
  id: string
  name: string
  unit: string
  stock: number
  sold_qty: number
  weeks_with_sales: number
  avg_weekly_qty: number
  forecast_next_week: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface Recommendation {
  id: string
  producer_id: string
  name: string
  price: number
  unit: string
  image_url?: string | null
  producer_name: string
  order_count: number
}

export const aiService = {
  /** AI-1 — prévision de la demande, réservée au producteur concerné. */
  forecast: (producerId: string) => api.get<ForecastLine[]>(`/ai/forecast/${producerId}`),

  /** AI-2 — produits populaires que l'utilisateur n'a pas encore achetés. */
  recommendations: () => api.get<Recommendation[]>('/ai/recommendations'),
}
