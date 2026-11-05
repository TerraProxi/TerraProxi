import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/** En dev, '/api' passe par le proxy Vite (vite.config.ts) : pas de CORS. */
const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || '/api'

export const ACCESS_TOKEN_KEY = 'access_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'
export const USER_KEY = 'user'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

export function storeTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

const SECONDS_PER_MINUTE = 60

/** Délai indiqué par l'en-tête Retry-After d'une réponse 429 (en secondes). */
export function retryAfterSeconds(err: unknown): number | null {
  if (!(err instanceof AxiosError)) return null
  const seconds = Number(err.response?.headers['retry-after'])
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

function formatRetryDelay(seconds: number): string {
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} s`
  return `${Math.ceil(seconds / SECONDS_PER_MINUTE)} min`
}

/** Message d'erreur lisible à partir de l'enveloppe {error, status} de l'API (délai d'attente compris pour un 429). */
export function apiErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined
    const retryAfter = retryAfterSeconds(err)
    const retryHint = err.response?.status === 429 && retryAfter ? ` Réessayez dans ${formatRetryDelay(retryAfter)}.` : ''
    if (data?.error) return `${data.error}${retryHint}`
    if (err.response?.status === 429) return `Trop de tentatives.${retryHint}`
    if (err.code === AxiosError.ECONNABORTED) return 'Le serveur met trop de temps à répondre, réessayez'
    if (!err.response) return 'Serveur injoignable, vérifiez votre connexion'
  }
  return fallback
}

/** Code HTTP d'une erreur d'API (undefined si la requête n'a pas abouti). */
export const apiErrorStatus = (err: unknown): number | undefined =>
  err instanceof AxiosError ? err.response?.status : undefined

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** Un seul renouvellement à la fois, partagé par les requêtes qui échouent en même temps. */
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null
  try {
    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
    )
    storeTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const isAuthCall = /^\/auth\/(login|register|refresh|logout)$/.test(original?.url ?? '')
    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
      return Promise.reject(error)
    }

    original._retried = true
    refreshing ??= refreshAccessToken().finally(() => { refreshing = null })
    const newToken = await refreshing
    if (newToken) {
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    }

    clearSession()
    window.location.href = '/login'
    return Promise.reject(error)
  },
)

export default api
