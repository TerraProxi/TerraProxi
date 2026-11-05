import { create } from 'zustand'
import { Alert } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import api, {
  ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, clearTokens, setSessionExpiredHandler, storeTokens,
} from '../services/api'
import { unregisterPushToken } from '../services/pushNotifications'

export type UserRole = 'CONSUMER' | 'PRODUCER' | 'ADMIN'

/** specs/schemas/user.schema.json */
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone?: string | null
  avatar_url?: string | null
  /** Consentement aux newsletters des producteurs (opt-in, faux par défaut). */
  newsletter_opt_in: boolean
  created_at: string
}

/** L'application mobile est réservée aux consommateurs (le back-office producteur est sur le web). */
export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  gdpr_consent: boolean
  newsletter_opt_in: boolean
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
  /** Met à jour le profil en mémoire après une modification (profil, email). */
  setUser: (user: User) => void
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
    const { data } = await api.post<SessionResponse>('/auth/register', { ...payload, role: 'CONSUMER' })
    await storeTokens(data.access_token, data.refresh_token)
    set({ user: data.user, isAuthenticated: true })
  },

  logout: async () => {
    // Retrait du jeton push avant de révoquer la session (sinon la requête n'est plus autorisée).
    // Au mieux : la déconnexion locale doit aboutir même hors ligne.
    await unregisterPushToken().catch(() => undefined)
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    if (refreshToken) {
      // Révocation côté serveur au mieux : la déconnexion locale doit aboutir même hors ligne.
      await api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined)
    }
    await clearTokens()
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user }),

  deleteAccount: async () => {
    await api.delete('/users/me')
    await clearTokens()
    set({ user: null, isAuthenticated: false })
  },
}))

setSessionExpiredHandler(() => {
  if (!useAuthStore.getState().isAuthenticated) return
  useAuthStore.setState({ user: null, isAuthenticated: false })
  Alert.alert('Session expirée', 'Veuillez vous reconnecter pour continuer.')
})
