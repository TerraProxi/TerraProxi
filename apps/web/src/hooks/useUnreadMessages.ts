import { useEffect, useState } from 'react'
import { messagesService } from '../services/messages.service'

const POLL_INTERVAL_MS = 60_000

/** MSG-4 — nombre de messages non lus, rafraîchi chaque minute tant que l'onglet est visible. */
export function useUnreadMessages(isEnabled: boolean): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isEnabled) {
      setCount(0)
      return
    }
    let isActive = true
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      messagesService.unreadCount()
        .then(({ data }) => { if (isActive) setCount(data.unread_count) })
        .catch(() => undefined)
    }
    refresh()
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      isActive = false
      window.clearInterval(timer)
    }
  }, [isEnabled])

  return count
}
