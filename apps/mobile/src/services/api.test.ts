import { Alert } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import api, {
  ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, apiErrorMessage, authErrorTitle, storeTokens,
} from './api'
import { useAuthStore } from '../store/auth.store'
import { apiError, fakeNetwork, pathOf } from '../test/http'

const bearer = (config: { headers?: { Authorization?: unknown } }) => config.headers?.Authorization

beforeEach(async () => {
  await storeTokens('expired-access', 'refresh-1')
})

describe('renouvellement de session', () => {
  it('rejoue la requête une seule fois avec le nouveau jeton après un 401', async () => {
    const adapter = fakeNetwork((config) => {
      if (pathOf(config) === '/auth/refresh') return { status: 200, data: { access_token: 'fresh-access', refresh_token: 'refresh-2' } }
      return bearer(config) === 'Bearer fresh-access' ? { status: 200, data: ['commande'] } : { status: 401 }
    })

    const { data } = await api.get('/orders')

    expect(data).toEqual(['commande'])
    const paths = adapter.mock.calls.map(([config]) => pathOf(config))
    expect(paths).toEqual(['/orders', '/auth/refresh', '/orders'])
    expect(await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)).toBe('refresh-2')
  })

  it('ne lance qu\'un refresh pour plusieurs requêtes refusées en même temps', async () => {
    const adapter = fakeNetwork(async (config) => {
      if (pathOf(config) === '/auth/refresh') {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { status: 200, data: { access_token: 'fresh-access', refresh_token: 'refresh-2' } }
      }
      return bearer(config) === 'Bearer fresh-access' ? { status: 200, data: pathOf(config) } : { status: 401 }
    })

    const results = await Promise.all([api.get('/orders'), api.get('/messages'), api.get('/notifications')])

    expect(results.map((r) => r.data)).toEqual(['/orders', '/messages', '/notifications'])
    const refreshCalls = adapter.mock.calls.filter(([config]) => pathOf(config) === '/auth/refresh')
    expect(refreshCalls).toHaveLength(1)
  })

  it('déconnecte le store et efface les jetons quand le refresh échoue', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
    useAuthStore.setState({ isAuthenticated: true, user: null })
    fakeNetwork(() => ({ status: 401, data: { error: 'Session expirée' } }))

    await expect(api.get('/orders')).rejects.toThrow('HTTP 401')

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)).toBeNull()
    expect(await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)).toBeNull()
    expect(alert).toHaveBeenCalledWith('Session expirée', expect.any(String))
  })
})

describe('messages d\'erreur', () => {
  it('affiche le message de l\'API et un titre dédié sur un 429', () => {
    const blocked = apiError(429, { error: 'Trop de tentatives, réessayez dans 15 minutes', status: 429 })

    expect(authErrorTitle(blocked, 'Connexion impossible')).toBe('Trop de tentatives')
    expect(apiErrorMessage(blocked, 'Email ou mot de passe incorrect')).toBe('Trop de tentatives, réessayez dans 15 minutes')
    // Les autres erreurs gardent le titre habituel
    expect(authErrorTitle(apiError(401, { error: 'Identifiants invalides' }), 'Connexion impossible')).toBe('Connexion impossible')
  })
})
