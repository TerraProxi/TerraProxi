import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name) ?? null,
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}

interface UiStore {
  darkMode: boolean
  isDarkMode: boolean
  setDarkMode: (enabled: boolean) => void
  toggleDarkMode: () => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      darkMode: false,
      isDarkMode: false,
      setDarkMode: (enabled) => set({ darkMode: enabled, isDarkMode: enabled }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode, isDarkMode: !state.darkMode })),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
)
