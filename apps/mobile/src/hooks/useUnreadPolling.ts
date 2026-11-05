import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useAuthStore } from '../store/auth.store'
import { useUnreadStore } from '../store/unread.store'

const UNREAD_POLL_INTERVAL_MS = 60_000

/** Tient à jour le badge des messages non lus : au retour au premier plan et toutes les 60 s. */
export function useUnreadPolling() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const refresh = useUnreadStore((s) => s.refresh)

  useEffect(() => {
    if (!isAuthenticated) return
    void refresh()
    const timer = setInterval(() => { void refresh() }, UNREAD_POLL_INTERVAL_MS)
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refresh()
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [isAuthenticated, refresh])
}
