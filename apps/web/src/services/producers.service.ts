import api from './api'

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

  /** Profil producteur du compte connecté (404 tant qu'il n'est pas créé). */
  me: () => api.get<Producer>('/producers/me'),

  createOrUpdate: (data: ProducerInput) => api.post<Producer>('/producers', data),
}
