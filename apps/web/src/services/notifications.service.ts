import api from './api'

/** specs/schemas/notification.schema.json */
export type NotificationType = 'NEW_ORDER' | 'ORDER_STATUS' | 'PAYMENT' | 'NEW_MESSAGE' | 'NEWSLETTER' | 'ACCOUNT'

export type NotificationTarget = 'ORDER' | 'CONVERSATION' | 'PRODUCER'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  target_type: NotificationTarget | null
  target_id: string | null
  is_read: boolean
  created_at: string
}

export const NOTIFICATION_ICONS: Readonly<Record<NotificationType, string>> = {
  NEW_ORDER:    '🧾',
  ORDER_STATUS: '📦',
  PAYMENT:      '💳',
  NEW_MESSAGE:  '💬',
  NEWSLETTER:   '📰',
  ACCOUNT:      '✅',
}

export const NOTIFICATIONS_PAGE_SIZE = 30

export const notificationsService = {
  list: (params?: { unread_only?: boolean; limit?: number; offset?: number }) =>
    api.get<AppNotification[]>('/notifications', { params }),

  unreadCount: () => api.get<{ unread_count: number }>('/notifications/unread-count'),

  markRead: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`),

  markAllRead: () => api.post<void>('/notifications/read-all'),
}
