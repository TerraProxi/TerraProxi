import { useState, useEffect } from 'react'
import { MainLayout } from '../../components/layout/MainLayout'
import { ProducerMap } from '../../components/map/ProducerMap'
import { producersService, type Producer } from '../../services/producers.service'
import { useGeolocation } from '../../hooks/useGeolocation'
import { Link } from 'react-router-dom'

export function MapPage() {
  const [producers, setProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(false)
  const [radius, setRadius] = useState(30)
  const [search, setSearch] = useState('')
  const { lat, lon, loading: geoLoading, error: geoError, request } = useGeolocation()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await producersService.list({ lat: lat ?? undefined, lon: lon ?? undefined, radius, search: search || undefined })
      setProducers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [lat, lon, radius])

  const center: [number, number] | undefined =
    lat && lon ? [lat, lon] : undefined

  return (
    <MainLayout fullWidth>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 65px)' }}>
        {/* Panneau latéral */}
        <aside
          style={{
            background: 'var(--color-white)',
            borderRight: '1px solid var(--color-border)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
              🗺️ Producteurs près de vous
            </h2>

            {/* Géolocalisation */}
            <button
              onClick={request}
              disabled={geoLoading}
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                marginBottom: 'var(--space-3)',
              }}
            >
              {geoLoading ? 'Localisation…' : '📍 Me localiser'}
            </button>

            {geoError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginBottom: 8 }}>
                {geoError}
              </p>
            )}

            {/* Rayon */}
            {lat && lon && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  Rayon : {radius} km
                </label>
                <input
                  type="range"
                  min={5} max={100} step={5}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* Recherche */}
            <input
              placeholder="Rechercher un producteur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          {/* Liste */}
          <div style={{ flex: 1, padding: 'var(--space-4)' }}>
            {loading ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>Chargement…</p>
            ) : producers.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>
                Aucun producteur trouvé.
              </p>
            ) : (
              producers.map((p) => (
                <Link
                  key={p.id}
                  to={`/producers/${p.id}`}
                  style={{
                    display: 'block',
                    padding: 'var(--space-4)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-3)',
                    background: 'var(--color-white)',
                    transition: 'box-shadow var(--transition)',
                  }}
                >
                  <strong style={{ fontFamily: 'var(--font-heading)', display: 'block' }}>
                    {p.company_name}
                  </strong>
                  {p.city && (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                      📍 {p.city}
                    </span>
                  )}
                  {p.distance_km !== undefined && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', display: 'block', marginTop: 2 }}>
                      {p.distance_km.toFixed(1)} km
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </aside>

        {/* Carte */}
        <div>
          <ProducerMap
            producers={producers}
            center={center}
            zoom={center ? 11 : 6}
            height="100%"
          />
        </div>
      </div>
    </MainLayout>
  )
}
