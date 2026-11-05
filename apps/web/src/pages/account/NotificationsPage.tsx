import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import {
  NOTIFICATION_ICONS,
  NOTIFICATIONS_PAGE_SIZE,
  notificationsService,
  type AppNotification,
} from '../../services/notifications.service'
import type { UserRole } from '../../services/auth.service'
import { apiErrorMessage } from '../../services/api'
import { formatDateTime } from '../../utils/format'

/** Écran ouvert au clic (target_type / target_id de specs/schemas/notification.schema.json). */
function targetPath(notification: AppNotification, role: UserRole | undefined): string | null {
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

export function NotificationsPage() {
  const { user } = useAuth()
  const { unreadCount, refreshUnread } = useNotifications()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async (offset: number) => {
    try {
      const { data } = await notificationsService.list({ limit: NOTIFICATIONS_PAGE_SIZE, offset })
      setNotifications((current) => (offset === 0 ? data : [...current, ...data]))
      setHasMore(data.length === NOTIFICATIONS_PAGE_SIZE)
      setError(null)
    } catch (err) {
      setError(apiErrorMessage(err, 'Impossible de charger vos notifications'))
    }
  }, [])

  const reload = useCallback(async () => {
    setIsLoading(true)
    await fetchPage(0)
    setIsLoading(false)
  }, [fetchPage])

  useEffect(() => { reload() }, [reload])

  const loadMore = async () => {
    setIsLoadingMore(true)
    await fetchPage(notifications.length)
    setIsLoadingMore(false)
  }

  const open = async (notification: AppNotification) => {
    if (!notification.is_read) {
      try {
        await notificationsService.markRead(notification.id)
        setNotifications((list) => list.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
        refreshUnread()
      } catch (err) {
        setError(apiErrorMessage(err, 'Impossible de marquer la notification comme lue'))
      }
    }
    const path = targetPath(notification, user?.role)
    if (path) navigate(path)
  }

  const markAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await notificationsService.markAllRead()
      setNotifications((list) => list.map((n) => ({ ...n, is_read: true })))
      refreshUnread()
    } catch (err) {
      setError(apiErrorMessage(err, 'Impossible de tout marquer comme lu'))
    } finally {
      setIsMarkingAll(false)
    }
  }

  const hasUnread = unreadCount > 0 || notifications.some((n) => !n.is_read)

  return (
    <MainLayout title="Notifications">
      <div className="tp-page-header">
        <h1 className="tp-page-title">Notifications</h1>
        <Button variant="outline" onClick={markAllRead} loading={isMarkingAll} disabled={!hasUnread}>
          Tout marquer comme lu
        </Button>
      </div>

      {error && (
        <div className="tp-alert tp-alert--error" role="alert">
          {error} <Button variant="ghost" size="sm" onClick={reload}>Réessayer</Button>
        </div>
      )}

      <div aria-busy={isLoading} style={{ maxWidth: 820 }}>
        {isLoading ? (
          <p>Chargement…</p>
        ) : notifications.length === 0 ? (
          <p className="tp-muted">Aucune notification pour le moment.</p>
        ) : (
          <ul className="tp-stack" style={{ listStyle: 'none', gap: 'var(--space-3)' }}>
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  className="tp-notification"
                  data-unread={!notification.is_read}
                  onClick={() => open(notification)}
                >
                  <span aria-hidden="true" style={{ fontSize: 24 }}>{NOTIFICATION_ICONS[notification.type]}</span>
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: 'block' }}>
                      {!notification.is_read && <span className="sr-only">Non lue : </span>}
                      {notification.title}
                    </strong>
                    <span className="tp-small" style={{ display: 'block', whiteSpace: 'pre-line' }}>{notification.body}</span>
                    <span className="tp-small tp-muted">{formatDateTime(notification.created_at)}</span>
                  </span>
                  {!notification.is_read && <span className="tp-unread-dot" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasMore && !isLoading && (
          <Button variant="outline" onClick={loadMore} loading={isLoadingMore} style={{ marginTop: 'var(--space-4)' }}>
            Voir plus
          </Button>
        )}
      </div>
    </MainLayout>
  )
}
