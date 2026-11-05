import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { producersService, type Producer } from '../../services/producers.service'
import { apiErrorMessage } from '../../services/api'
import { useGeolocation, type MapNavigationState } from '../../hooks/useGeolocation'

const NEARBY_RADIUS_KM = 50
const NEARBY_LIMIT = 6

/** Producteurs proches (après « Me localiser ») ou derniers inscrits. */
export function NearbyProducers() {
  const { lat, lon, loading: isLocating, error: geoError, request } = useGeolocation()
  const [producers, setProducers] = useState<Producer[]>([])
  const [error, setError] = useState<string | null>(null)
  const isLocated = lat != null && lon != null

  useEffect(() => {
    const query = isLocated
      ? { lat, lon, radius: NEARBY_RADIUS_KM, limit: NEARBY_LIMIT }
      : { limit: NEARBY_LIMIT }
    setError(null)
    producersService.list(query)
      .then(({ data }) => setProducers(data))
      .catch((err) => setError(apiErrorMessage(err, 'Impossible de charger les producteurs')))
  }, [isLocated, lat, lon])

  const mapState: MapNavigationState | undefined = isLocated ? { position: { lat, lon } } : undefined

  return (
    <section className="tp-section" aria-labelledby="titre-producteurs">
      <div className="tp-page-header">
        <h2 id="titre-producteurs" className="tp-section-title" style={{ marginBottom: 0 }}>
          {isLocated ? 'Producteurs près de chez vous' : 'Nos producteurs'}
        </h2>
        <div className="tp-cluster">
          {!isLocated && (
            <Button variant="outline" size="sm" onClick={request} loading={isLocating}>📍 Me localiser</Button>
          )}
          <Link to="/map" state={mapState} style={{ fontWeight: 600 }}>Voir sur la carte →</Link>
        </div>
      </div>

      {geoError && <p className="tp-field-error" role="alert">{geoError}</p>}
      {error && <p className="tp-alert tp-alert--error" role="alert">{error}</p>}

      {!error && producers.length === 0 ? (
        <p className="tp-muted">
          {isLocated ? `Aucun producteur à moins de ${NEARBY_RADIUS_KM} km pour le moment.` : 'Aucun producteur inscrit pour le moment.'}
        </p>
      ) : (
        <div className="tp-card-grid">
          {producers.map((p) => (
            <Link key={p.id} to={`/producers/${p.id}`} className="tp-producer-item" style={{ marginBottom: 0 }}>
              <strong>{p.company_name}</strong>
              {p.city && <span className="tp-small tp-muted">📍 {p.city}</span>}
              {p.distance_km != null && (
                <span className="tp-small" style={{ display: 'block', color: 'var(--color-primary-strong)' }}>
                  à {p.distance_km.toFixed(1)} km
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
