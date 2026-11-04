/**
 * Géocodage d'adresses françaises via la Base Adresse Nationale
 * (api-adresse.data.gouv.fr) : service public, gratuit, sans clé.
 * Seule l'adresse saisie est envoyée, aucune donnée de compte.
 */
const BAN_SEARCH_URL = 'https://api-adresse.data.gouv.fr/search/'

export interface GeocodedPoint {
  lat: number
  lon: number
  label: string
  city?: string
}

interface BanResponse {
  features: Array<{
    geometry: { coordinates: [number, number] }
    properties: { label: string; city?: string }
  }>
}

export async function geocodeAddress(query: string): Promise<GeocodedPoint | null> {
  const url = `${BAN_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`BAN ${res.status}`)
  const data = (await res.json()) as BanResponse
  const feature = data.features[0]
  if (!feature) return null
  const [lon, lat] = feature.geometry.coordinates
  return { lat, lon, label: feature.properties.label, city: feature.properties.city }
}
