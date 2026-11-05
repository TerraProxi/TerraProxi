import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useAuthStore } from '../store/auth.store'
import { useUnreadStore } from '../store/unread.store'
import { useNotificationsStore } from '../store/notifications.store'

const BADGE_POLL_INTERVAL_MS = 60_000

/**
 * Tient à jour les badges (messages non lus, notifications non lues) : à la connexion,
 * au retour au premier plan et toutes les 60 s.
 */
export function useUnreadPolling() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const refreshMessages = useUnreadStore((s) => s.refresh)
  const refreshNotifications = useNotificationsStore((s) => s.refresh)

  useEffect(() => {
    if (!isAuthenticated) return
    const refreshAll = () => {
      void refreshMessages()
      void refreshNotifications()
    }
    refreshAll()
    const timer = setInterval(refreshAll, BADGE_POLL_INTERVAL_MS)
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refreshAll()
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [isAuthenticated, refreshMessages, refreshNotifications])
}
