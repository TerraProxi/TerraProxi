/** specs/schemas/notification.schema.json */
export type NotificationType = 'NEW_ORDER' | 'ORDER_STATUS' | 'PAYMENT' | 'NEW_MESSAGE' | 'NEWSLETTER' | 'ACCOUNT'

export type NotificationTargetType = 'ORDER' | 'CONVERSATION' | 'PRODUCER'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  target_type: NotificationTargetType | null
  target_id: string | null
  is_read: boolean
  created_at: string
}
