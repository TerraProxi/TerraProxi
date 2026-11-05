import * as Location from 'expo-location'

export interface Coordinates {
  lat: number
  lon: number
}

/**
 * Dernière position connue, sans redemander l'autorisation (déjà accordée sur la carte ou
 * la liste des boutiques). null si l'autorisation manque ou si aucune position n'est connue.
 */
export async function getKnownPosition(): Promise<Coordinates | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync()
    if (!granted) return null
    const position = await Location.getLastKnownPositionAsync()
    return position ? { lat: position.coords.latitude, lon: position.coords.longitude } : null
  } catch {
    // Service de localisation indisponible : l'appelant se passe de la distance
    return null
  }
}
