import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, clearTokens, storeTokens } from '../services/api'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'CONSUMER' | 'PRODUCER' | 'ADMIN'
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  role?: 'CONSUMER' | 'PRODUCER'
  gdpr_consent: boolean
}

interface SessionResponse {
  user: User
  access_token: string
  refresh_token: string
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  /** RGPD — droit à l'effacement depuis l'application (exigé aussi par les stores). */
  deleteAccount: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  /** Appelé au lancement (App.tsx) : restaure la session ; le refresh token prend le relais si besoin. */
  initialize: async () => {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const { data } = await api.get<User>('/auth/me')
      set({ user: data, isAuthenticated: true, isLoading: false })
    } catch {
      await clearTokens()
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email, password) => {
    const { data } = await api.post<SessionResponse>('/auth/login', { email, password })
    await storeTokens(data.access_token, data.refresh_token)
    set({ user: data.user, isAuthenticated: true })
  },

  register: async (payload) => {
    const { data } = await api.post<SessionResponse>('/auth/register', payload)
    await storeTokens(data.access_token, data.refresh_token)
    set({ user: data.user, isAuthenticated: true })
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    if (refreshToken) await api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined)
    await clearTokens()
    set({ user: null, isAuthenticated: false })
  },

  deleteAccount: async () => {
    await api.delete('/users/me')
    await clearTokens()
    set({ user: null, isAuthenticated: false })
  },
}))
