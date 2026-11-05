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
  description?: string | null
  price: number
  unit: string
  category: string
  image_url?: string | null
  producer_name: string
  order_count: number
}

/* ── Assistant (specs/schemas/ai-chat.schema.json) ─────────────────────── */

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface CartContextPayload {
  groups: {
    producer_id: string
    producer_name: string
    delivery_mode: 'delivery' | 'pickup'
    items: { product_id: string; product_name: string; quantity: number; unit: string; price: number }[]
    subtotal: number
  }[]
  total: number
  count: number
}

export interface AiChatRequest {
  message: string
  history?: ChatHistoryItem[]
  lat?: number
  lon?: number
  radius_km?: number
  cart_context?: CartContextPayload
}

export interface ProducerLink {
  producer_id: string
  company_name: string
  reason: string
  city?: string
}

export interface ResolvedCartProduct {
  product_id: string
  name: string
  price: number
  unit: string
  producer_id: string
  producer_name: string
  image_url: string | null
}

export type CartAction =
  | { type: 'add_to_cart'; product: ResolvedCartProduct; quantity: number }
  | { type: 'remove_from_cart'; product_id: string; product_name: string }
  | { type: 'update_cart_quantity'; product_id: string; product_name: string; quantity: number }
  | { type: 'clear_cart' }

export interface ProductPick extends ResolvedCartProduct {
  short_label: string
  quantity_options: number[]
}

export interface AiChatResponse {
  reply: string
  producer_links: ProducerLink[]
  cart_actions: CartAction[]
  product_picks: ProductPick[]
  quick_replies: string[]
}

/** Gemini peut mettre plusieurs dizaines de secondes à répondre. */
const CHAT_TIMEOUT_MS = 60_000

export const aiService = {
  /** AI-1 — prévision de la demande, réservée au producteur concerné. */
  forecast: (producerId: string) => api.get<ForecastLine[]>(`/ai/forecast/${producerId}`),

  /** AI-2 — produits populaires que l'utilisateur n'a pas encore achetés. */
  recommendations: () => api.get<Recommendation[]>('/ai/recommendations'),

  /** AI-3 — assistant conversationnel ; 503 si l'IA n'est pas configurée ou indisponible. */
  chat: (payload: AiChatRequest) => api.post<AiChatResponse>('/ai/chat', payload, { timeout: CHAT_TIMEOUT_MS }),
}
