import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { useAuth } from '../../contexts/AuthContext'
import type { User } from '../../services/auth.service'

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
// L'en-tête (panier, notifications, messagerie) n'est pas l'objet de ce test
vi.mock('../../components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

function Landing() {
  return <p data-testid="landing">{useLocation().pathname}</p>
}

function renderLogin(login: (email: string, password: string) => Promise<User>, from?: string) {
  vi.mocked(useAuth).mockReturnValue({ login } as unknown as ReturnType<typeof useAuth>)
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: from ? { from } : null }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function submit(email = 'jean@ferme.fr', password = 'secret123') {
  await userEvent.type(screen.getByLabelText('Adresse email'), email)
  await userEvent.type(screen.getByLabelText('Mot de passe'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
}

const producer = { id: 'p1', role: 'PRODUCER' } as User

describe('LoginPage', () => {
  it('relie chaque champ à son label et envoie les identifiants saisis', async () => {
    const login = vi.fn().mockResolvedValue(producer)
    renderLogin(login)

    expect(screen.getByLabelText('Adresse email').getAttribute('type')).toBe('email')
    await submit()

    expect(login).toHaveBeenCalledWith('jean@ferme.fr', 'secret123')
  })

  it('annonce l\'erreur de l\'API dans une alerte, délai Retry-After compris', async () => {
    const config = { headers: new AxiosHeaders() }
    const response = { status: 429, statusText: '', data: { error: 'Trop de tentatives' }, headers: { 'retry-after': '600' }, config } as AxiosResponse
    renderLogin(vi.fn().mockRejectedValue(new AxiosError('429', AxiosError.ERR_BAD_REQUEST, config, null, response)))

    await submit()

    expect((await screen.findByRole('alert')).textContent).toBe('Trop de tentatives Réessayez dans 10 min.')
  })

  it.each([
    ['la page demandée avant la connexion', '/messages', '/messages'],
    ['le tableau de bord pour un producteur sans page demandée', undefined, '/producer/dashboard'],
  ])('redirige vers %s', async (_case, from, expected) => {
    renderLogin(vi.fn().mockResolvedValue(producer), from)
    await submit()
    expect((await screen.findByTestId('landing')).textContent).toBe(expected)
  })
})
