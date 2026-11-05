import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { registerPushToken } from './pushNotifications'
import { fakeNetwork, pathOf } from '../test/http'

const expoConfig = Constants.expoConfig as { extra: { eas?: { projectId?: string } } }
const mocked = Notifications as jest.Mocked<typeof Notifications>

const okNetwork = () => fakeNetwork(() => ({ status: 204 }))
const sentBodies = (adapter: jest.Mock) => adapter.mock.calls
  .filter(([config]) => pathOf(config) === '/users/me/push-token')
  .map(([config]) => JSON.parse(config.data))

beforeEach(() => {
  jest.clearAllMocks()
  expoConfig.extra = { eas: { projectId: 'projet-eas' } }
})

describe('enregistrement du jeton push', () => {
  it('sans projectId EAS, ne demande rien et n\'appelle pas l\'API', async () => {
    expoConfig.extra = {}
    const adapter = okNetwork()

    await registerPushToken()

    expect(mocked.getExpoPushTokenAsync).not.toHaveBeenCalled()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('permission refusée : retire le jeton (token null)', async () => {
    mocked.getPermissionsAsync.mockResolvedValueOnce({ granted: false, canAskAgain: false } as never)
    const adapter = okNetwork()

    await registerPushToken()

    expect(mocked.getExpoPushTokenAsync).not.toHaveBeenCalled()
    expect(sentBodies(adapter)).toEqual([{ token: null }])
  })

  it('permission accordée : envoie le jeton Expo obtenu avec le projectId', async () => {
    const adapter = okNetwork()

    await registerPushToken()

    expect(mocked.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'projet-eas' })
    expect(sentBodies(adapter)).toEqual([{ token: 'ExponentPushToken[test-token]' }])
  })
})
