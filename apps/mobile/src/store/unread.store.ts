import { create } from 'zustand'
import api from '../services/api'
import { useAuthStore } from './auth.store'

interface UnreadStore {
  /** Messages reçus non lus, tous interlocuteurs confondus (GET /messages/unread-count). */
  count: number
  refresh: () => Promise<void>
}

export const useUnreadStore = create<UnreadStore>((set) => ({
  count: 0,
  refresh: async () => {
    if (!useAuthStore.getState().isAuthenticated) {
      set({ count: 0 })
      return
    }
    try {
      const { data } = await api.get<{ unread_count: number }>('/messages/unread-count')
      set({ count: data.unread_count })
    } catch {
      // Badge indicatif : on garde la dernière valeur connue, le prochain rafraîchissement réessaiera
    }
  },
}))

// Une déconnexion (volontaire ou session expirée) remet le badge à zéro
useAuthStore.subscribe((state, previous) => {
  if (previous.isAuthenticated && !state.isAuthenticated) useUnreadStore.setState({ count: 0 })
})
