import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { producersService, type ProducerInput } from '../../services/producers.service'
import { apiErrorMessage } from '../../services/api'
import { geocodeAddress } from '../../services/geocoding.service'

const EMPTY: ProducerInput = { company_name: '' }

/** PROD-1 / PROD-2 — fiche producteur : sans elle, ni catalogue ni présence sur la carte. */
export function ProducerProfilePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<ProducerInput>(EMPTY)
  const [isNew, setIsNew] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    producersService.me()
      .then(({ data }) => {
        setIsNew(false)
        setForm({
          company_name: data.company_name,
          description: data.description ?? undefined,
          address: data.address ?? undefined,
          city: data.city ?? undefined,
          postal_code: data.postal_code ?? undefined,
          latitude: data.latitude ?? undefined,
          longitude: data.longitude ?? undefined,
          website_url: data.website_url ?? undefined,
          banner_url: data.banner_url ?? undefined,
          opening_hours: data.opening_hours ?? undefined,
        })
      })
      .catch((err) => {
        if (!(err instanceof AxiosError && err.response?.status === 404)) {
          setError(apiErrorMessage(err, 'Impossible de charger votre fiche'))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof ProducerInput) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value === '' ? undefined : value }))

  const locate = async () => {
    const query = [form.address, form.postal_code, form.city].filter(Boolean).join(' ')
    if (!query) {
      setError('Renseignez une adresse ou une ville pour la localiser')
      return
    }
    setLocating(true)
    setError(null)
    try {
      const point = await geocodeAddress(query)
      if (!point) {
        setError('Adresse introuvable, précisez-la')
        return
      }
      setForm((f) => ({ ...f, latitude: point.lat, longitude: point.lon, city: f.city ?? point.city }))
      setNotice(`Position trouvée : ${point.label}`)
    } catch {
      setError('Service de géolocalisation indisponible')
    } finally {
      setLocating(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.company_name?.trim()) {
      setError('Le nom de l\'exploitation est obligatoire')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await producersService.createOrUpdate({ ...form, company_name: form.company_name.trim() })
      if (isNew) {
        navigate('/producer/catalog')
        return
      }
      setNotice('Fiche enregistrée')
    } catch (err) {
      setError(apiErrorMessage(err, 'Enregistrement impossible'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <MainLayout><p>Chargement…</p></MainLayout>

  const hasPosition = form.latitude !== undefined && form.longitude !== undefined

  return (
    <MainLayout>
      <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
        {isNew ? 'Créer ma fiche producteur' : 'Ma fiche producteur'}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
        Ces informations apparaissent sur la carte et sur votre page publique.
      </p>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}
      {notice && <div className="tp-alert tp-alert--success" role="status">{notice}</div>}

      <form className="tp-card" onSubmit={submit} noValidate style={{ maxWidth: 760 }}>
        <Input label="Nom de l'exploitation *" id="company_name" required value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />

        <div className="tp-field">
          <label className="tp-label" htmlFor="description">Présentation</label>
          <textarea id="description" className="tp-input" rows={4} value={form.description ?? ''}
            onChange={(e) => set('description')(e.target.value)} />
        </div>

        <div className="tp-grid-2">
          <Input label="Adresse" id="address" value={form.address ?? ''} onChange={(e) => set('address')(e.target.value)} />
          <Input label="Code postal" id="postal_code" inputMode="numeric" maxLength={10} value={form.postal_code ?? ''}
            onChange={(e) => set('postal_code')(e.target.value)} />
          <Input label="Ville" id="city" value={form.city ?? ''} onChange={(e) => set('city')(e.target.value)} />
          <Input label="Horaires d'ouverture" id="opening_hours" placeholder="Mer. et sam. 9 h – 13 h"
            value={form.opening_hours ?? ''} onChange={(e) => set('opening_hours')(e.target.value)} />
          <Input label="Site web" id="website_url" type="url" value={form.website_url ?? ''}
            onChange={(e) => set('website_url')(e.target.value)} />
          <Input label="Photo de couverture (URL)" id="banner_url" type="url" value={form.banner_url ?? ''}
            onChange={(e) => set('banner_url')(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <Button variant="outline" onClick={locate} loading={locating}>📍 Localiser l'adresse</Button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {hasPosition
              ? `Position : ${form.latitude!.toFixed(4)}, ${form.longitude!.toFixed(4)}`
              : 'Sans position, vous n\'apparaissez pas sur la carte.'}
          </span>
        </div>

        <Button type="submit" variant="secondary" loading={saving}>
          {isNew ? 'Créer ma fiche' : 'Enregistrer'}
        </Button>
      </form>
    </MainLayout>
  )
}
