import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { AgendaSection } from '../../components/events/AgendaSection'
import { eventsService, type EventInput, type ProducerEvent } from '../../services/events.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { fromDateTimeLocal, toDateTimeLocal } from '../../utils/format'

/** Limites de specs/schemas/event.schema.json (EventInput) */
const TITLE_MAX_LENGTH = 200
const LOCATION_MAX_LENGTH = 500
const DESCRIPTION_MAX_LENGTH = 5000

interface EventForm {
  id?: string
  title: string
  description: string
  location: string
  startsAt: string
  endsAt: string
}

const EMPTY_FORM: EventForm = { title: '', description: '', location: '', startsAt: '', endsAt: '' }

const toForm = (event: ProducerEvent): EventForm => ({
  id: event.id,
  title: event.title,
  description: event.description ?? '',
  location: event.location ?? '',
  startsAt: toDateTimeLocal(event.starts_at),
  endsAt: event.ends_at ? toDateTimeLocal(event.ends_at) : '',
})

function toInput(form: EventForm): EventInput {
  return {
    title: form.title.trim(),
    starts_at: fromDateTimeLocal(form.startsAt),
    ...(form.description.trim() && { description: form.description.trim() }),
    ...(form.location.trim() && { location: form.location.trim() }),
    ...(form.endsAt && { ends_at: fromDateTimeLocal(form.endsAt) }),
  }
}

const isPast = (event: ProducerEvent) => new Date(event.ends_at ?? event.starts_at).getTime() < Date.now()

/** PROD-6 — agenda du producteur : marchés, portes ouvertes, ventes à la ferme. */
export function AgendaPage() {
  const [events, setEvents] = useState<ProducerEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(true)
  const [form, setForm] = useState<EventForm | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await eventsService.mine()
      setEvents(data)
      setError(null)
    } catch (err) {
      if (apiErrorStatus(err) === 404) setHasProfile(false)
      else setError(apiErrorMessage(err, 'Impossible de charger votre agenda'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Le formulaire ouvert reçoit le focus pour que la saisie commence au clavier
  const isFormOpen = form !== null
  useEffect(() => {
    if (isFormOpen) formRef.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [isFormOpen])

  const edit = (patch: Partial<EventForm>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    if (form.endsAt && form.endsAt <= form.startsAt) {
      setFormError('La fin doit être postérieure au début.')
      return
    }
    setIsSaving(true)
    setFormError(null)
    try {
      if (form.id) await eventsService.update(form.id, toInput(form))
      else await eventsService.create(toInput(form))
      setNotice(form.id ? 'Rendez-vous modifié' : 'Rendez-vous ajouté')
      setForm(null)
      await load()
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Enregistrement impossible'))
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (event: ProducerEvent) => {
    if (!window.confirm(`Supprimer « ${event.title} » de votre agenda ?`)) return
    try {
      await eventsService.delete(event.id)
      setEvents((list) => list.filter((e) => e.id !== event.id))
      setNotice('Rendez-vous supprimé')
    } catch (err) {
      setError(apiErrorMessage(err, 'Suppression impossible'))
    }
  }

  if (!hasProfile) {
    return (
      <MainLayout title="Mon agenda">
        <h1 className="tp-page-title">Mon agenda</h1>
        <p style={{ marginBottom: 'var(--space-4)' }}>Créez d'abord votre fiche producteur pour publier vos rendez-vous.</p>
        <Link to="/producer/profile" style={{ fontWeight: 700 }}>Créer ma fiche producteur →</Link>
      </MainLayout>
    )
  }

  const upcoming = events.filter((e) => !isPast(e)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const past = events.filter(isPast)

  return (
    <MainLayout title="Mon agenda">
      <div className="tp-page-header">
        <h1 className="tp-page-title">Mon agenda</h1>
        <Button variant="secondary" onClick={() => { setForm({ ...EMPTY_FORM }); setFormError(null); setNotice(null) }}>
          + Ajouter un rendez-vous
        </Button>
      </div>
      <p className="tp-muted" style={{ marginBottom: 'var(--space-5)' }}>
        Marchés, portes ouvertes, ventes à la ferme : vos rendez-vous à venir apparaissent sur votre fiche et dans l'agenda de proximité.
      </p>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}
      <p role="status" className={notice ? 'tp-alert tp-alert--success' : 'sr-only'}>{notice}</p>

      {form && (
        <form ref={formRef} className="tp-card" onSubmit={save} aria-labelledby="titre-formulaire-rdv" style={{ marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-md)' }}>
          <h2 id="titre-formulaire-rdv" style={{ marginBottom: 'var(--space-4)' }}>{form.id ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h2>
          {formError && <div className="tp-alert tp-alert--error" role="alert">{formError}</div>}

          <Input label="Titre *" id="rdv-titre" required maxLength={TITLE_MAX_LENGTH}
            value={form.title} onChange={(e) => edit({ title: e.target.value })} />
          <div className="tp-grid-2">
            <Input label="Début *" id="rdv-debut" type="datetime-local" required
              value={form.startsAt} onChange={(e) => edit({ startsAt: e.target.value })} />
            <Input label="Fin (facultative)" id="rdv-fin" type="datetime-local" min={form.startsAt || undefined}
              value={form.endsAt} onChange={(e) => edit({ endsAt: e.target.value })} />
          </div>
          <Input label="Lieu (s'il diffère de l'exploitation)" id="rdv-lieu" maxLength={LOCATION_MAX_LENGTH}
            placeholder="Marché des Arceaux, Montpellier" value={form.location} onChange={(e) => edit({ location: e.target.value })} />
          <div className="tp-field">
            <label htmlFor="rdv-description" className="tp-label">Description</label>
            <textarea id="rdv-description" className="tp-input" rows={3} maxLength={DESCRIPTION_MAX_LENGTH}
              value={form.description} onChange={(e) => edit({ description: e.target.value })} />
          </div>

          <div className="tp-cluster">
            <Button type="submit" variant="secondary" loading={isSaving}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => setForm(null)}>Annuler</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p>Chargement…</p>
      ) : (
        <>
          <AgendaSection title="À venir" events={upcoming} emptyText="Aucun rendez-vous à venir." onEdit={(e) => { setForm(toForm(e)); setFormError(null); setNotice(null) }} onDelete={remove} />
          {past.length > 0 && (
            <AgendaSection title="Passés" events={past} emptyText="" onEdit={(e) => { setForm(toForm(e)); setFormError(null) }} onDelete={remove} />
          )}
        </>
      )}
    </MainLayout>
  )
}
