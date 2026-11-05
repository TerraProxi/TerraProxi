import { useState, useCallback } from 'react'

export interface GeoPosition {
  lat: number
  lon: number
}

interface GeoState {
  lat: number | null
  lon: number | null
  error: string | null
  loading: boolean
}

const GEOLOCATION_TIMEOUT_MS = 10_000

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Vous avez refusé la localisation : autorisez-la dans votre navigateur ou cherchez par nom.',
  2: 'Position indisponible pour le moment.',
  3: 'La localisation a pris trop de temps, réessayez.',
}

/** La position n'est jamais envoyée ailleurs qu'à l'API de recherche, ni enregistrée (cf. PrivacyPage). */
export function useGeolocation(initial?: GeoPosition | null) {
  const [state, setState] = useState<GeoState>({
    lat: initial?.lat ?? null,
    lon: initial?.lon ?? null,
    error: null,
    loading: false,
  })

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Votre navigateur ne permet pas la géolocalisation.' }))
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({ lat: pos.coords.latitude, lon: pos.coords.longitude, error: null, loading: false })
      },
      (err) => {
        setState((s) => ({ ...s, error: ERROR_MESSAGES[err.code] ?? 'Localisation impossible.', loading: false }))
      },
      { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT_MS },
    )
  }, [])

  return { ...state, request }
}

/** État de navigation pour transmettre une position à la carte sans la mettre dans l'URL. */
export interface MapNavigationState {
  position?: GeoPosition
  shouldLocate?: boolean
}
