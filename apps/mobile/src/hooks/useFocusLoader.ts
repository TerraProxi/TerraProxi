import { useCallback, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { apiErrorMessage } from '../services/api'

interface FocusLoader {
  /** Premier chargement en cours (aucune donnée à afficher). */
  isLoading: boolean
  /** Rechargement déclenché par « tirer pour actualiser ». */
  isRefreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  reload: () => Promise<void>
}

/**
 * Charge les données à chaque fois que l'écran reprend le focus, et expose
 * l'état pour un RefreshControl. `load` doit être stable (useCallback).
 */
export function useFocusLoader(load: () => Promise<void>, errorFallback: string): FocusLoader {
  const [isLoading, setLoading] = useState(true)
  const [isRefreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoaded = useRef(false)

  const run = useCallback(async (mode: 'focus' | 'refresh' | 'reload') => {
    if (mode === 'refresh') setRefreshing(true)
    if (mode === 'reload') setLoading(true)
    try {
      await load()
      setError(null)
      hasLoaded.current = true
    } catch (err) {
      setError(apiErrorMessage(err, errorFallback))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [load, errorFallback])

  useFocusEffect(useCallback(() => { void run('focus') }, [run]))

  return {
    isLoading: isLoading && !hasLoaded.current,
    isRefreshing,
    error,
    refresh: () => run('refresh'),
    reload: () => run('reload'),
  }
}
