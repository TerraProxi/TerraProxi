import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { homeFor, type RedirectState } from '../../utils/redirect'

interface Props {
  children: ReactNode
  /** Espace réservé : CONSUMER (achats) ou PRODUCER (boutique). Sans rôle, tout compte connecté. */
  role?: 'CONSUMER' | 'PRODUCER'
  /** Laisse passer les visiteurs non connectés (le rôle ne filtre alors que les comptes connectés). */
  allowAnonymous?: boolean
}

/** Garde de route : renvoie vers la connexion en mémorisant la page demandée, ou vers l'espace du bon rôle. */
export function RequireAuth({ children, role, allowAnonymous = false }: Props) {
  const { isAuthenticated, user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!isAuthenticated || !user) {
    if (allowAnonymous) return <>{children}</>
    const state: RedirectState = { from: `${location.pathname}${location.search}` }
    return <Navigate to="/login" replace state={state} />
  }
  if (role === 'PRODUCER' && user.role !== 'PRODUCER') return <Navigate to={homeFor(user)} replace />
  if (role === 'CONSUMER' && user.role === 'PRODUCER') return <Navigate to={homeFor(user)} replace />
  return <>{children}</>
}
