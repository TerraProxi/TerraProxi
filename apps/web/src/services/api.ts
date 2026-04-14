import axios from 'axios'
import { setupMockInterceptor } from './mock.interceptor'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
})

// Intercepteur : ajoute le JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur : gestion des erreurs 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

setupMockInterceptor(api)

export default api
