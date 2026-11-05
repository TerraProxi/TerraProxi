import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { ProducerMap } from '../../components/map/ProducerMap'
import { Button } from '../../components/ui/Button'
import { producersService, type Producer } from '../../services/producers.service'
import { apiErrorMessage } from '../../services/api'
import { useGeolocation, type MapNavigationState } from '../../hooks/useGeolocation'

const DEFAULT_RADIUS_KM = 30
const LOCATED_ZOOM = 11

export function MapPage() {
  const navigationState = useLocation().state as MapNavigationState | null
  const [producers, setProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(DEFAULT_RADIUS_KM)
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const { lat, lon, loading: geoLoading, error: geoError, request } = useGeolocation(navigationState?.position)

  // Arrivée depuis l'accueil avec « Découvrir sur la carte » : on localise directement
  const shouldLocateOnArrival = navigationState?.shouldLocate === true
  useEffect(() => { if (shouldLocateOnArrival) request() }, [shouldLocateOnArrival, request])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await producersService.list({
        lat: lat ?? undefined,
        lon: lon ?? undefined,
        radius: lat != null ? radius : undefined,
        search: submittedSearch || undefined,
      })
      setProducers(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Impossible de charger les producteurs'))
    } finally {
      setLoading(false)
    }
  }, [lat, lon, radius, submittedSearch])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (search.trim() === submittedSearch) load()
    else setSubmittedSearch(search.trim())
  }

  const center: [number, number] | undefined = lat != null && lon != null ? [lat, lon] : undefined

  return (
    <MainLayout title="Carte des producteurs" fullWidth>
      <div className="tp-map-layout">
        <section className="tp-map-layout__panel" aria-labelledby="titre-carte">
          <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
            <h1 id="titre-carte" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
              Producteurs près de vous
            </h1>

            <Button variant="primary" className="tp-btn--block" onClick={request} loading={geoLoading}>
              📍 Me localiser
            </Button>

            {geoError && <p className="tp-field-error" role="alert" style={{ marginTop: 'var(--space-2)' }}>{geoError}</p>}

            {center && (
              <div className="tp-field" style={{ marginTop: 'var(--space-3)' }}>
                <label htmlFor="rayon" className="tp-label">Rayon : {radius} km</label>
                <input
                  id="rayon"
                  type="range"
                  min={5} max={100} step={5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <form role="search" onSubmit={handleSearch} style={{ marginTop: 'var(--space-3)' }}>
              <label htmlFor="recherche-producteur" className="tp-label">Rechercher un producteur</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                <input
                  id="recherche-producteur"
                  type="search"
                  className="tp-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={100}
                />
                <Button type="submit" variant="outline">Chercher</Button>
              </div>
            </form>
          </div>

          <div style={{ flex: 1, padding: 'var(--space-4)' }} aria-live="polite" aria-busy={loading}>
            {error ? (
              <div className="tp-alert tp-alert--error" role="alert">
                {error}{' '}
                <Button variant="ghost" size="sm" onClick={load}>Réessayer</Button>
              </div>
            ) : loading ? (
              <p className="tp-muted" style={{ textAlign: 'center', marginTop: 32 }}>Chargement…</p>
            ) : producers.length === 0 ? (
              <p className="tp-muted" style={{ textAlign: 'center', marginTop: 32 }}>Aucun producteur trouvé.</p>
            ) : (
              <>
                <p className="tp-small tp-muted" style={{ marginBottom: 'var(--space-3)' }}>
                  {producers.length} producteur{producers.length > 1 ? 's' : ''}
                </p>
                {producers.map((p) => (
                  <Link key={p.id} to={`/producers/${p.id}`} className="tp-producer-item">
                    <strong>{p.company_name}</strong>
                    {p.city && <span className="tp-small tp-muted">📍 {p.city}</span>}
                    {p.distance_km != null && (
                      <span className="tp-small" style={{ color: 'var(--color-primary-strong)', display: 'block', marginTop: 2 }}>
                        à {p.distance_km.toFixed(1)} km
                      </span>
                    )}
                  </Link>
                ))}
              </>
            )}
          </div>
        </section>

        <div className="tp-map-layout__map">
          <ProducerMap
            producers={producers}
            center={center}
            zoom={center ? LOCATED_ZOOM : undefined}
            height="100%"
          />
        </div>
      </div>
    </MainLayout>
  )
}
