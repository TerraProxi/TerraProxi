import axios from 'axios'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const DEV_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3002/api' : 'http://localhost:3002/api'
const API_URL = __DEV__ ? DEV_API_URL : 'https://gateway.terraproxi.fr/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token')
    }
    return Promise.reject(error)
  },
)

export default api
