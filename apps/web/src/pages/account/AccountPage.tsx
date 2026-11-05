import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth.service'
import { apiErrorMessage } from '../../services/api'

type Feedback = { kind: 'success' | 'error'; text: string } | null

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <div className={`tp-alert tp-alert--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
      {feedback.text}
    </div>
  )
}

function ProfileSection() {
  const { user, setUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [isNewsletterOptIn, setIsNewsletterOptIn] = useState(user?.newsletter_opt_in ?? false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await authService.updateProfile({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        newsletter_opt_in: isNewsletterOptIn,
      })
      setUser(data)
      setFeedback({ kind: 'success', text: 'Profil mis à jour' })
    } catch (err) {
      setFeedback({ kind: 'error', text: apiErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="tp-card" onSubmit={submit}>
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Mes informations</h2>
      <FeedbackLine feedback={feedback} />
      <div className="tp-grid-2">
        <Input label="Prénom" id="first_name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Nom" id="last_name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Input label="Téléphone" id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Adresse email" id="email_ro" value={user?.email ?? ''} readOnly />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 'var(--space-4)' }}>
        <input id="newsletter_opt_in" type="checkbox" checked={isNewsletterOptIn}
          onChange={(e) => setIsNewsletterOptIn(e.target.checked)} style={{ marginTop: 3, flexShrink: 0, width: 20, height: 20 }} />
        <label htmlFor="newsletter_opt_in">
          Recevoir les newsletters des producteurs chez qui j'ai commandé
          <span className="tp-hint" style={{ display: 'block' }}>Retirable à tout moment ; elles arrivent dans vos notifications.</span>
        </label>
      </div>
      <Button type="submit" variant="secondary" loading={saving}>Enregistrer</Button>
    </form>
  )
}

function SecuritySection() {
  const { setUser } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [saving, setSaving] = useState(false)

  const run = async (action: () => Promise<string>) => {
    if (!current) {
      setFeedback({ kind: 'error', text: 'Saisissez votre mot de passe actuel' })
      return
    }
    setSaving(true)
    try {
      setFeedback({ kind: 'success', text: await action() })
      setCurrent('')
      setNext('')
      setNewEmail('')
    } catch (err) {
      setFeedback({ kind: 'error', text: apiErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = () => run(async () => {
    if (next.length < 8) throw new Error('Le nouveau mot de passe doit faire au moins 8 caractères')
    await authService.changePassword(current, next)
    return 'Mot de passe modifié. Vos autres sessions ont été déconnectées.'
  })

  const changeEmail = () => run(async () => {
    const { data } = await authService.changeEmail(current, newEmail.trim())
    setUser(data)
    return `Adresse email remplacée par ${data.email}`
  })

  return (
    <section className="tp-card">
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Sécurité</h2>
      <FeedbackLine feedback={feedback} />
      <Input label="Mot de passe actuel" id="current_password" type="password" autoComplete="current-password"
        value={current} onChange={(e) => setCurrent(e.target.value)} />
      <div className="tp-grid-2">
        <div>
          <Input label="Nouveau mot de passe (8 caractères min.)" id="new_password" type="password"
            autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <Button variant="primary" onClick={changePassword} disabled={saving || !next}>Changer le mot de passe</Button>
        </div>
        <div>
          <Input label="Nouvelle adresse email" id="new_email" type="email" autoComplete="email"
            value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <Button variant="primary" onClick={changeEmail} disabled={saving || !newEmail}>Changer l'email</Button>
        </div>
      </div>
    </section>
  )
}

function PrivacySection() {
  const { forgetSession } = useAuth()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busy, setBusy] = useState(false)

  const exportData = async () => {
    setBusy(true)
    try {
      const { data } = await authService.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'terraproxi-mes-donnees.json'
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setFeedback({ kind: 'error', text: apiErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const deleteAccount = async () => {
    const isConfirmed = window.confirm(
      'Supprimer définitivement votre compte ? Vos messages et votre fiche producteur seront effacés ; '
      + 'vos commandes passées sont conservées de façon anonyme pour la comptabilité.',
    )
    if (!isConfirmed) return
    setBusy(true)
    try {
      await authService.deleteAccount()
      forgetSession()
      navigate('/', { replace: true })
    } catch (err) {
      setFeedback({ kind: 'error', text: apiErrorMessage(err) })
      setBusy(false)
    }
  }

  return (
    <section className="tp-card">
      <h2 style={{ marginBottom: 'var(--space-2)' }}>Mes données personnelles</h2>
      <p className="tp-muted" style={{ marginBottom: 'var(--space-4)' }}>
        Vos droits RGPD, détaillés dans la <Link to="/privacy">politique de confidentialité</Link>.
      </p>
      <FeedbackLine feedback={feedback} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Button variant="outline" onClick={exportData} disabled={busy}>Télécharger mes données (JSON)</Button>
        <Button variant="danger" onClick={deleteAccount} disabled={busy}>Supprimer mon compte</Button>
      </div>
    </section>
  )
}

export function AccountPage() {
  return (
    <MainLayout title="Mon compte">
      <h1 className="tp-page-title">Mon compte</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 820 }}>
        <ProfileSection />
        <SecuritySection />
        <PrivacySection />
      </div>
    </MainLayout>
  )
}
