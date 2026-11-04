import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/** L'émulateur Android joint la machine hôte via 10.0.2.2. */
const DEV_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3002/api' : 'http://localhost:3002/api'
const PROD_API_URL = 'https://gateway.terraproxi.fr/api'

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '')
  || (__DEV__ ? DEV_API_URL : PROD_API_URL)

export const ACCESS_TOKEN_KEY = 'access_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

export async function storeTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
}

/** Message lisible à partir de l'enveloppe d'erreur {error, status} de l'API. */
export function apiErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
    if (!err.response) return 'Serveur injoignable, vérifiez votre connexion'
  }
  return fallback
}

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null
  try {
    const { data } = await axios.post<{ access_token: string; refresh_token: string }>(
      `${API_URL}/auth/refresh`,
      { refresh_token: refreshToken },
    )
    await storeTokens(data.access_token, data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

/** Sur 401, renouvelle une fois la session avec le refresh token puis rejoue la requête. */
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
    await clearTokens()
    return Promise.reject(error)
  },
)

export default api
