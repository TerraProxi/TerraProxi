import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { notificationsService } from '../services/notifications.service'

/** NOTIF — badge de la cloche, rafraîchi chaque minute tant que l'onglet est visible. */
const POLL_INTERVAL_MS = 60_000

interface NotificationsContextValue {
  unreadCount: number
  /** À appeler après avoir lu une ou toutes les notifications. */
  refreshUnread: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshUnread = useCallback(() => {
    notificationsService.unreadCount()
      .then(({ data }) => setUnreadCount(data.unread_count))
      // Le badge est secondaire : en cas d'échec il garde sa dernière valeur jusqu'au prochain passage
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }
    refreshUnread()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshUnread()
    }, POLL_INTERVAL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') refreshUnread() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAuthenticated, refreshUnread])

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
