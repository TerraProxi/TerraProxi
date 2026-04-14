import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
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

interface Props {
  producers: Producer[]
  center?: [number, number]
  zoom?: number
  height?: number | string
}

export function ProducerMap({
  producers,
  center = [46.603354, 1.888334], // Centre France
  zoom = 6,
  height = 500,
}: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%', borderRadius: 'var(--radius-lg)' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {producers.map((p) =>
        p.latitude && p.longitude ? (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', minWidth: 180 }}>
                <strong style={{ fontFamily: 'var(--font-heading)', display: 'block', marginBottom: 4 }}>
                  {p.company_name}
                </strong>
                {p.city && <span style={{ fontSize: 13, color: '#666' }}>📍 {p.city}</span>}
                {p.distance_km !== undefined && (
                  <span style={{ fontSize: 12, color: '#888', display: 'block', marginTop: 2 }}>
                    à {p.distance_km.toFixed(1)} km
                  </span>
                )}
                <Link
                  to={`/producers/${p.id}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    background: 'var(--color-secondary)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Voir la boutique →
                </Link>
              </div>
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  )
}
