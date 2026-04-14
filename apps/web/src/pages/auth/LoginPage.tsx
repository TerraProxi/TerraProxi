import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { useAuth } from '../../contexts/AuthContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Identifiants incorrects'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: 'var(--space-8) 0' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: 'var(--space-8)', color: 'var(--color-secondary)' }}>
          Connexion
        </h1>

        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          {error && (
            <div
              style={{
                background: '#FEE2E2',
                color: 'var(--color-danger)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-5)',
                fontSize: 'var(--text-sm)',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label htmlFor="email" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
              }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label htmlFor="password" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--color-secondary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 'var(--text-base)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              S'inscrire
            </Link>
          </p>
        </form>
      </div>
    </MainLayout>
  )
}
