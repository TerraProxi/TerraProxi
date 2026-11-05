import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import type { Producer } from '../../services/producers.service'

// Corrige l'icône Leaflet dans les bundlers Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = defaultIcon

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334]
const FRANCE_ZOOM = 6

interface Props {
  producers: Producer[]
  center?: [number, number]
  zoom?: number
  height?: number | string
  /** Nom accessible de la carte (région interactive). */
  label?: string
}

/** MapContainer ne lit `center` qu'au montage : on recentre explicitement quand il change. */
function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const [lat, lon] = center
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.setView([lat, lon], zoom, { animate: !prefersReducedMotion })
  }, [map, lat, lon, zoom])
  return null
}

export function ProducerMap({
  producers,
  center = FRANCE_CENTER,
  zoom = FRANCE_ZOOM,
  height = 500,
  label = 'Carte des producteurs',
}: Props) {
  return (
    <div role="region" aria-label={label} style={{ height, width: '100%' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <MapRecenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {producers.map((p) =>
          p.latitude != null && p.longitude != null ? (
            <Marker key={p.id} position={[p.latitude, p.longitude]} title={p.company_name}>
              <Popup>
                <div style={{ fontFamily: 'var(--font-body)', minWidth: 180 }}>
                  <strong style={{ fontFamily: 'var(--font-heading)', display: 'block', marginBottom: 4 }}>
                    {p.company_name}
                  </strong>
                  {p.city && <span style={{ fontSize: 13, color: '#4B5563' }}>📍 {p.city}</span>}
                  {p.distance_km != null && (
                    <span style={{ fontSize: 12, color: '#4B5563', display: 'block', marginTop: 2 }}>
                      à {p.distance_km.toFixed(1)} km
                    </span>
                  )}
                  <Link
                    to={`/producers/${p.id}`}
                    className="tp-btn tp-btn--secondary tp-btn--sm"
                    style={{ marginTop: 8, color: '#fff' }}
                  >
                    Voir la boutique →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ) : null,
        )}
      </MapContainer>
    </div>
  )
}
