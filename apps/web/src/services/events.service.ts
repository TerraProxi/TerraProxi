import api from './api'

/** specs/schemas/event.schema.json — rendez-vous d'un producteur (marché, portes ouvertes…). */
export interface ProducerEvent {
  id: string
  producer_id: string
  producer_name: string
  producer_city: string | null
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
  created_at: string
  updated_at: string
}

/** Corps de POST /events et PUT /events/{id} (dates ISO 8601). */
export interface EventInput {
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at?: string
}

export interface EventsQuery {
  producer_id?: string
  lat?: number
  lon?: number
  radius?: number
  include_past?: boolean
  limit?: number
  offset?: number
}

export const eventsService = {
  list: (query?: EventsQuery) => api.get<ProducerEvent[]>('/events', { params: query }),

  /** Agenda complet du producteur connecté, passé compris. */
  mine: () => api.get<ProducerEvent[]>('/events/mine'),

  create: (data: EventInput) => api.post<ProducerEvent>('/events', data),

  update: (id: string, data: EventInput) => api.put<ProducerEvent>(`/events/${id}`, data),

  delete: (id: string) => api.delete(`/events/${id}`),
}
