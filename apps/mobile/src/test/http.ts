import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { api } from '../services/api'

export interface FakeResponse {
  status: number
  data?: unknown
}

export type FakeRoute = (config: InternalAxiosRequestConfig) => FakeResponse | Promise<FakeResponse>

/**
 * Remplace le réseau par `route` pour l'instance `api` et pour axios (utilisé par le refresh).
 * Les statuts ≥ 400 sont rejetés comme le ferait axios.
 */
export function fakeNetwork(route: FakeRoute): jest.Mock {
  const adapter = jest.fn<ReturnType<AxiosAdapter>, Parameters<AxiosAdapter>>(async (config) => {
    const { status, data } = await route(config)
    const response = { status, data, statusText: String(status), headers: {}, config }
    if (status >= 400) {
      throw new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_REQUEST, config, null, response)
    }
    return response
  })
  api.defaults.adapter = adapter
  axios.defaults.adapter = adapter
  return adapter
}

/** Erreur d'API telle que la produit axios, pour les fonctions de formatage. */
export function apiError(status: number, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  return new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_REQUEST, config, null, {
    status, data, statusText: String(status), headers: {}, config,
  })
}

/** Chemin de la requête, sans l'URL de base. */
export const pathOf = (config: InternalAxiosRequestConfig) =>
  (config.url ?? '').replace(/^https?:\/\/[^/]+\/api/, '')
