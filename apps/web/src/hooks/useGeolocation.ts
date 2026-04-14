import { useState, useCallback } from 'react'

interface GeoState {
  lat: number | null
  lon: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lon: null,
    error: null,
    loading: false,
  })

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Géolocalisation non supportée' }))
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState({ lat: null, lon: null, error: err.message, loading: false })
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  return { ...state, request }
}
