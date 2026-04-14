import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type User } from '../services/auth.service'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (data: Parameters<typeof authService.register>[0]) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const saved = localStorage.getItem('user')

    if (token && saved) {
      try {
        const user = JSON.parse(saved) as User
        setState({ user, isLoading: false, isAuthenticated: true })
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false })
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }))
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await authService.login({ email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setState({ user: data.user, isLoading: false, isAuthenticated: true })
  }

  const register = async (payload: Parameters<typeof authService.register>[0]) => {
    const { data } = await authService.register(payload)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setState({ user: data.user, isLoading: false, isAuthenticated: true })
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setState({ user: null, isLoading: false, isAuthenticated: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
