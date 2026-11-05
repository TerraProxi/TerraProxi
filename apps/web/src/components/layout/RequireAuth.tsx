import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { homeFor, type RedirectState } from '../../utils/redirect'
import type { UserRole } from '../../services/auth.service'

interface Props {
  children: ReactNode
  /** Espace réservé à un rôle (achats, boutique ou administration). Sans rôle, tout compte connecté. */
  role?: UserRole
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
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />
  return <>{children}</>
}
