import api from './api'

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
  first_name?: string
  last_name?: string
  distance_km?: number
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

  createOrUpdate: (data: Partial<Producer>) =>
    api.post<Producer>('/producers', data),
}
