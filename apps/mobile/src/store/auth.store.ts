import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import api from '../services/api'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'CONSUMER' | 'PRODUCER' | 'ADMIN'
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  role?: 'CONSUMER' | 'PRODUCER'
  gdpr_consent: boolean
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const token = await SecureStore.getItemAsync('access_token')
    if (token) {
      try {
        const { data } = await api.get<User>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        set({ user: data, isAuthenticated: true, isLoading: false })
      } catch {
        await SecureStore.deleteItemAsync('access_token')
        set({ isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<{ user: User; access_token: string }>(
      '/auth/login',
      { email, password },
    )
    await SecureStore.setItemAsync('access_token', data.access_token)
    set({ user: data.user, isAuthenticated: true })
  },

  register: async (payload) => {
    const { data } = await api.post<{ user: User; access_token: string }>(
      '/auth/register',
      payload,
    )
    await SecureStore.setItemAsync('access_token', data.access_token)
    set({ user: data.user, isAuthenticated: true })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token')
    set({ user: null, isAuthenticated: false })
  },
}))
