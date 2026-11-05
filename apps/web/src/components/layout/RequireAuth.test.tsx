import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './RequireAuth'
import { useAuth } from '../../contexts/AuthContext'
import type { User, UserRole } from '../../services/auth.service'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

type AuthValue = ReturnType<typeof useAuth>

function signIn(role: UserRole | null) {
  const user: User | null = role
    ? { id: 'u1', email: 'a@b.fr', first_name: 'A', last_name: 'B', role, newsletter_opt_in: false, created_at: '2026-01-01T00:00:00Z' }
    : null
  vi.mocked(useAuth).mockReturnValue({ user, isAuthenticated: user !== null, isLoading: false } as AuthValue)
}

/** Affiche le chemin atteint et l'état de navigation transmis par la garde. */
function Landing() {
  const location = useLocation()
  return <p data-testid="landing">{location.pathname} {JSON.stringify(location.state)}</p>
}

function renderAt(path: string, guard: { role?: UserRole; allowAnonymous?: boolean } = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/zone" element={<RequireAuth {...guard}><p>contenu protégé</p></RequireAuth>} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('renvoie un visiteur vers la connexion en mémorisant la page demandée', () => {
    signIn(null)
    renderAt('/zone?onglet=2', { role: 'CONSUMER' })
    expect(screen.getByTestId('landing').textContent).toBe('/login {"from":"/zone?onglet=2"}')
  })

  it('laisse un visiteur consulter une page ouverte aux anonymes', () => {
    signIn(null)
    renderAt('/zone', { role: 'CONSUMER', allowAnonymous: true })
    expect(screen.getByText('contenu protégé')).toBeTruthy()
  })

  it.each([
    ['PRODUCER', 'CONSUMER', '/producer/dashboard'],
    ['ADMIN', 'CONSUMER', '/admin'],
    ['CONSUMER', 'ADMIN', '/'],
    ['CONSUMER', 'PRODUCER', '/'],
  ] as const)('un compte %s sur un espace %s part vers %s', (userRole, routeRole, expected) => {
    signIn(userRole)
    renderAt('/zone', { role: routeRole })
    expect(screen.getByTestId('landing').textContent).toBe(`${expected} null`)
  })

  it('affiche la page quand le rôle correspond', () => {
    signIn('ADMIN')
    renderAt('/zone', { role: 'ADMIN' })
    expect(screen.getByText('contenu protégé')).toBeTruthy()
  })
})
