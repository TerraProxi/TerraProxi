import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../contexts/AuthContext'
import { apiErrorMessage } from '../../services/api'
import { homeFor, readRedirectTarget } from '../../utils/redirect'

type Role = 'CONSUMER' | 'PRODUCER'

const ROLE_LABELS: Record<Role, string> = { CONSUMER: '🛒 Consommateur', PRODUCER: '🌾 Producteur' }
const PASSWORD_MIN_LENGTH = 8

export function RegisterPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const defaultRole: Role = params.get('role') === 'PRODUCER' ? 'PRODUCER' : 'CONSUMER'

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: defaultRole,
    gdpr_consent: false,
    newsletter_opt_in: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const set = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.gdpr_consent) { setError('Vous devez accepter la politique de confidentialité'); return }
    setError('')
    setLoading(true)
    try {
      const user = await register(form)
      const target = user.role === 'PRODUCER' ? homeFor(user) : readRedirectTarget(location.state) ?? homeFor(user)
      navigate(target, { replace: true })
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Erreur lors de l\'inscription'))
      setLoading(false)
    }
  }

  return (
    <MainLayout title="Créer un compte">
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 className="tp-page-title" style={{ textAlign: 'center', color: 'var(--color-secondary-strong)' }}>
          Créer un compte
        </h1>

        <form className="tp-card" onSubmit={handleSubmit} style={{ boxShadow: 'var(--shadow-md)' }}>
          {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

          <fieldset className="tp-field" style={{ border: 'none' }}>
            <legend className="tp-label" style={{ marginBottom: 'var(--space-2)' }}>Je suis…</legend>
            <div className="tp-choices">
              {(['CONSUMER', 'PRODUCER'] as const).map((role) => (
                <label key={role} className="tp-choice">
                  <input type="radio" name="role" value={role} checked={form.role === role} onChange={() => set('role', role)} />
                  <span>{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="tp-grid-2">
            <Input label="Prénom" id="first_name" required autoComplete="given-name"
              value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Nom" id="last_name" required autoComplete="family-name"
              value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>

          <Input label="Adresse email" id="email" type="email" required autoComplete="email"
            value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label={`Mot de passe (${PASSWORD_MIN_LENGTH} caractères minimum)`} id="password" type="password"
            required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password"
            value={form.password} onChange={(e) => set('password', e.target.value)} />

          {/* RGPD — consentement explicite */}
          <div className="tp-small" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 'var(--space-4)' }}>
            <input
              id="gdpr_consent"
              type="checkbox"
              required
              checked={form.gdpr_consent}
              onChange={(e) => set('gdpr_consent', e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, width: 20, height: 20 }}
            />
            <label htmlFor="gdpr_consent">
              J'accepte la <Link to="/privacy">politique de confidentialité</Link> et le traitement de mes
              données personnelles conformément au RGPD.
            </label>
          </div>

          <div className="tp-small" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 'var(--space-6)' }}>
            <input
              id="newsletter_opt_in"
              type="checkbox"
              checked={form.newsletter_opt_in}
              onChange={(e) => set('newsletter_opt_in', e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0, width: 20, height: 20 }}
            />
            <label htmlFor="newsletter_opt_in">
              (Facultatif) Recevoir les newsletters des producteurs chez qui je commande.
            </label>
          </div>

          <Button type="submit" variant="secondary" size="lg" className="tp-btn--block" loading={loading}>
            Créer mon compte
          </Button>

          <p className="tp-small" style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
            Déjà un compte ? <Link to="/login" state={location.state}>Se connecter</Link>
          </p>
        </form>
      </div>
    </MainLayout>
  )
}
