import { create } from 'zustand'
import api from '../services/api'
import { useAuthStore } from './auth.store'

interface NotificationsStore {
  /** Notifications in-app non lues (GET /notifications/unread-count) : badge de la cloche. */
  unreadCount: number
  refresh: () => Promise<void>
  setUnreadCount: (count: number) => void
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  unreadCount: 0,
  refresh: async () => {
    if (!useAuthStore.getState().isAuthenticated) {
      set({ unreadCount: 0 })
      return
    }
    try {
      const { data } = await api.get<{ unread_count: number }>('/notifications/unread-count')
      set({ unreadCount: data.unread_count })
    } catch {
      // Badge indicatif : on garde la dernière valeur connue, le prochain rafraîchissement réessaiera
    }
  },
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
}))

useAuthStore.subscribe((state, previous) => {
  if (previous.isAuthenticated && !state.isAuthenticated) useNotificationsStore.setState({ unreadCount: 0 })
})
