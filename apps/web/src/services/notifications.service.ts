import api from './api'
import type { UserRole } from './auth.service'

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

/** Écran ouvert au clic (target_type / target_id de specs/schemas/notification.schema.json). */
export function notificationTargetPath(
  notification: Pick<AppNotification, 'target_type' | 'target_id'>,
  role: UserRole | undefined,
): string | null {
  const { target_type: type, target_id: id } = notification
  if (!type || !id) return null
  switch (type) {
    case 'ORDER':
      return role === 'PRODUCER' ? `/producer/orders/${id}` : `/orders/${id}`
    case 'CONVERSATION':
      return `/messages/${id}`
    case 'PRODUCER':
      return `/producers/${id}`
  }
}

export const notificationsService = {
  list: (params?: { unread_only?: boolean; limit?: number; offset?: number }) =>
    api.get<AppNotification[]>('/notifications', { params }),

  unreadCount: () => api.get<{ unread_count: number }>('/notifications/unread-count'),

  markRead: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`),

  markAllRead: () => api.post<void>('/notifications/read-all'),
}
