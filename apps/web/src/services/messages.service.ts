import api from './api'

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  sent_at: string
  first_name?: string
  last_name?: string
}

export interface Conversation {
  partner_id: string
  partner_name: string
  last_content: string
  last_sent_at: string
  unread_count: number
}

export const messagesService = {
  conversations: () =>
    api.get<Conversation[]>('/messages'),

  thread: (partnerId: string, params?: { limit?: number; before?: string }) =>
    api.get<Message[]>(`/messages/${partnerId}`, { params }),

  send: (receiver_id: string, content: string) =>
    api.post<Message>('/messages', { receiver_id, content }),
}
