import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../contexts/AuthContext'
import { apiErrorMessage } from '../../services/api'
import { homeFor, readRedirectTarget } from '../../utils/redirect'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTarget = readRedirectTarget(location.state)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(redirectTarget ?? homeFor(user), { replace: true })
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Identifiants incorrects'))
      setLoading(false)
    }
  }

  return (
    <MainLayout title="Connexion">
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <h1 className="tp-page-title" style={{ textAlign: 'center', color: 'var(--color-secondary-strong)' }}>
          Connexion
        </h1>

        {redirectTarget && (
          <p className="tp-alert tp-alert--info">Connectez-vous pour continuer.</p>
        )}

        <form className="tp-card" onSubmit={handleSubmit} style={{ boxShadow: 'var(--shadow-md)' }}>
          {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

          <Input label="Adresse email" id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input label="Mot de passe" id="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />

          <Button type="submit" variant="secondary" size="lg" className="tp-btn--block" loading={loading}>
            Se connecter
          </Button>

          <p className="tp-small" style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" state={location.state}>S'inscrire</Link>
          </p>
        </form>
      </div>
    </MainLayout>
  )
}
