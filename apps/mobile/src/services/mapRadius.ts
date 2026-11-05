/** Rayon maximal accepté par GET /producers (specs/api/producers-api.yaml). */
export const MAX_RADIUS_KM = 500
const KM_PER_DEGREE = 111

/**
 * Rayon de recherche couvrant la zone visible de la carte, plafonné à 500 km :
 * au-delà l'API répond 400 et la carte se viderait en dézoomant.
 */
export function mapSearchRadiusKm(latitudeDelta: number, longitudeDelta: number): number {
  return Math.min(MAX_RADIUS_KM, Math.max(latitudeDelta, longitudeDelta) * KM_PER_DEGREE)
}
