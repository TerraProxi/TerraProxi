import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { useAuth } from '../../contexts/AuthContext'

export function RegisterPage() {
  const [params] = useSearchParams()
  const defaultRole = (params.get('role') as 'CONSUMER' | 'PRODUCER') ?? 'CONSUMER'

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: defaultRole,
    gdpr_consent: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.gdpr_consent) { setError('Vous devez accepter la politique de confidentialité'); return }
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate(form.role === 'PRODUCER' ? '/producer/dashboard' : '/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Erreur lors de l\'inscription'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
  }

  return (
    <MainLayout>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 'var(--space-8) 0' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: 'var(--space-8)', color: 'var(--color-secondary)' }}>
          Créer un compte
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
            <div style={{ background: '#FEE2E2', color: 'var(--color-danger)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          {/* Type de compte */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
              Je suis…
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {(['CONSUMER', 'PRODUCER'] as const).map((role) => (
                <label
                  key={role}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '0.75rem',
                    border: `2px solid ${form.role === role ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: form.role === role ? 700 : 400,
                    color: form.role === role ? 'var(--color-secondary)' : 'var(--color-dark)',
                    background: form.role === role ? '#EBFAEF' : 'transparent',
                  }}
                >
                  <input type="radio" name="role" value={role} checked={form.role === role} onChange={() => set('role', role)} style={{ display: 'none' }} />
                  {role === 'CONSUMER' ? '🛒 Consommateur' : '🌾 Producteur'}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Prénom</label>
              <input type="text" required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Nom</label>
              <input type="text" required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} style={fieldStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Adresse email</label>
            <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" style={fieldStyle} />
          </div>

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Mot de passe (8 caractères minimum)</label>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" style={fieldStyle} />
          </div>

          {/* RGPD — consentement explicite */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 'var(--space-6)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={form.gdpr_consent}
              onChange={(e) => set('gdpr_consent', e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <span>
              J'accepte la{' '}
              <Link to="/privacy" style={{ color: 'var(--color-primary)' }}>politique de confidentialité</Link>
              {' '}et le traitement de mes données personnelles conformément au RGPD.
            </span>
          </label>

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
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </MainLayout>
  )
}
