import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { aiService, type NewsletterTone } from '../../services/ai.service'
import { producersService, type Newsletter } from '../../services/producers.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { formatDateTime } from '../../utils/format'

/** Limites de specs/schemas/newsletter.schema.json et de POST /ai/newsletter */
const SUBJECT_MAX_LENGTH = 200
const BODY_MAX_LENGTH = 2000
const TOPIC_MAX_LENGTH = 500
const TONES: readonly { value: NewsletterTone; label: string }[] = [
  { value: 'chaleureux', label: 'Chaleureux' },
  { value: 'informatif', label: 'Informatif' },
  { value: 'festif', label: 'Festif' },
]

function draftErrorMessage(err: unknown): string {
  switch (apiErrorStatus(err)) {
    case 503: return 'La rédaction assistée n\'est pas disponible pour le moment. Vous pouvez écrire votre newsletter vous-même.'
    case 429: return apiErrorMessage(err, 'Quota de l\'assistant atteint, réessayez plus tard.')
    case 404: return 'Créez d\'abord votre fiche producteur.'
    default: return apiErrorMessage(err, 'Rédaction impossible')
  }
}

function sendErrorMessage(err: unknown): string {
  if (apiErrorStatus(err) === 429) return 'Une newsletter a déjà été envoyée aujourd\'hui : la prochaine pourra partir 24 h après la précédente.'
  return apiErrorMessage(err, 'Envoi impossible')
}

/** AI-4 — newsletter aux clients abonnés, avec brouillon rédigé par l'IA (une par 24 h). */
export function NewsletterPage() {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<NewsletterTone>('chaleureux')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isDrafting, setIsDrafting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState<Newsletter[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadHistory = useCallback(() => {
    producersService.newsletters()
      .then(({ data }) => { setHistory(data); setHistoryError(null) })
      .catch((err) => setHistoryError(apiErrorMessage(err, 'Historique indisponible')))
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const draft = async () => {
    setIsDrafting(true)
    setDraftError(null)
    setNotice('')
    try {
      const { data } = await aiService.newsletterDraft({ tone, ...(topic.trim() && { topic: topic.trim() }) })
      setSubject(data.subject)
      setBody(data.body)
      setNotice('Brouillon prêt : relisez-le et modifiez-le avant l\'envoi.')
    } catch (err) {
      setDraftError(draftErrorMessage(err))
    } finally {
      setIsDrafting(false)
    }
  }

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!window.confirm('Envoyer cette newsletter à vos clients abonnés ? Une seule newsletter peut partir par 24 h.')) return
    setIsSending(true)
    setSendError(null)
    setNotice('')
    try {
      const { data } = await producersService.sendNewsletter({ subject: subject.trim(), body: body.trim() })
      setNotice(`Newsletter envoyée à ${data.recipient_count} client${data.recipient_count > 1 ? 's' : ''} abonné${data.recipient_count > 1 ? 's' : ''}.`)
      setSubject('')
      setBody('')
      loadHistory()
    } catch (err) {
      setSendError(sendErrorMessage(err))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <MainLayout title="Newsletter">
      <h1 className="tp-page-title" style={{ marginBottom: 'var(--space-2)' }}>Newsletter</h1>
      <p className="tp-muted" style={{ marginBottom: 'var(--space-6)' }}>
        Envoyée en notification à vos clients ayant accepté les newsletters. Une par 24 heures.{' '}
        <Link to="/producer/dashboard">Retour au tableau de bord</Link>
      </p>

      <p role="status" className={notice ? 'tp-alert tp-alert--success' : 'sr-only'}>{notice}</p>

      <div className="tp-split">
        <div className="tp-stack">
          <section className="tp-card" aria-labelledby="titre-ia">
            <h2 id="titre-ia" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>✨ Rédiger avec l'IA</h2>
            <Input label="Sujet (facultatif)" id="newsletter-sujet" maxLength={TOPIC_MAX_LENGTH}
              placeholder="Arrivée des fraises, marché de samedi…" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <fieldset className="tp-field" style={{ border: 'none' }}>
              <legend className="tp-label" style={{ marginBottom: 'var(--space-2)' }}>Ton</legend>
              <div className="tp-choices">
                {TONES.map((t) => (
                  <label key={t.value} className="tp-choice">
                    <input type="radio" name="ton" value={t.value} checked={tone === t.value} onChange={() => setTone(t.value)} />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {draftError && <div className="tp-alert tp-alert--error" role="alert">{draftError}</div>}
            <Button variant="outline" onClick={draft} loading={isDrafting}>Rédiger avec l'IA</Button>
          </section>

          <form className="tp-card" onSubmit={send} aria-labelledby="titre-envoi">
            <h2 id="titre-envoi" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Votre newsletter</h2>
            <Input label="Objet *" id="newsletter-objet" required maxLength={SUBJECT_MAX_LENGTH}
              value={subject} onChange={(e) => setSubject(e.target.value)} />
            <div className="tp-field">
              <label htmlFor="newsletter-texte" className="tp-label">Texte *</label>
              <textarea id="newsletter-texte" className="tp-input" rows={10} required maxLength={BODY_MAX_LENGTH}
                aria-describedby="newsletter-compteur" value={body} onChange={(e) => setBody(e.target.value)} />
              <span id="newsletter-compteur" className="tp-hint">{body.length} / {BODY_MAX_LENGTH} caractères</span>
            </div>
            {sendError && <div className="tp-alert tp-alert--error" role="alert">{sendError}</div>}
            <Button type="submit" variant="secondary" loading={isSending} disabled={!subject.trim() || !body.trim()}>
              Envoyer
            </Button>
          </form>
        </div>

        <section className="tp-card" aria-labelledby="titre-historique">
          <h2 id="titre-historique" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Envoyées</h2>
          {historyError ? (
            <p className="tp-muted">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="tp-muted tp-small">Aucune newsletter envoyée pour le moment.</p>
          ) : (
            <ul className="tp-stack" style={{ listStyle: 'none' }}>
              {history.map((n) => (
                <li key={n.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <strong>{n.subject}</strong>
                  <span className="tp-small tp-muted" style={{ display: 'block' }}>
                    {formatDateTime(n.sent_at)} · {n.recipient_count} destinataire{n.recipient_count > 1 ? 's' : ''}
                  </span>
                  <details>
                    <summary className="tp-small" style={{ cursor: 'pointer' }}>Lire<span className="sr-only"> « {n.subject} »</span></summary>
                    <p className="tp-small" style={{ whiteSpace: 'pre-line', marginTop: 'var(--space-2)' }}>{n.body}</p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </MainLayout>
  )
}
