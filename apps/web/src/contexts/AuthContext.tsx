import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type RegisterPayload, type User } from '../services/auth.service'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, clearSession, storeTokens } from '../services/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  /** Met à jour l'utilisateur affiché après une modification de profil. */
  setUser: (user: User) => void
  /** Vide la session locale sans appeler l'API (ex. après suppression du compte). */
  forgetSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ANONYMOUS: AuthState = { user: null, isLoading: false, isAuthenticated: false }

function readStoredUser(): User | null {
  try {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? (JSON.parse(saved) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, isAuthenticated: false })

  // Restaure la session puis la revalide auprès de l'API (compte supprimé, jeton révoqué…)
  useEffect(() => {
    const user = readStoredUser()
    if (!localStorage.getItem(ACCESS_TOKEN_KEY) || !user) {
      setState(ANONYMOUS)
      return
    }
    setState({ user, isLoading: false, isAuthenticated: true })
    authService.me()
      .then(({ data }) => setUserState(data))
      .catch(() => { /* l'intercepteur gère l'expiration ; hors ligne on garde la session */ })
  }, [])

  const setUserState = (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setState({ user, isLoading: false, isAuthenticated: true })
  }

  const openSession = (data: { user: User; access_token: string; refresh_token: string }) => {
    storeTokens(data.access_token, data.refresh_token)
    setUserState(data.user)
  }

  const login = async (email: string, password: string) => {
    const { data } = await authService.login({ email, password })
    openSession(data)
  }

  const register = async (payload: RegisterPayload) => {
    const { data } = await authService.register(payload)
    openSession(data)
  }

  const forgetSession = () => {
    clearSession()
    setState(ANONYMOUS)
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (refreshToken) await authService.logout(refreshToken).catch(() => undefined)
    forgetSession()
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, setUser: setUserState, forgetSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
