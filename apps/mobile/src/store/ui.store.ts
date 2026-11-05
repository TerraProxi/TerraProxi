import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistentStorage } from '../services/storage'

interface UiStore {
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  toggleDarkMode: () => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      darkMode: false,
      setDarkMode: (enabled) => set({ darkMode: enabled }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'ui-store',
      storage: persistentStorage,
    },
  ),
)
