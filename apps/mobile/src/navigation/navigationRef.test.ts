import { navigationRef, openNotificationTarget, flushPendingNotificationTarget } from './navigationRef'

const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => undefined)
const isReady = jest.spyOn(navigationRef, 'isReady')
const currentRoute = jest.spyOn(navigationRef, 'getCurrentRoute')

const onScreen = (name: string) => {
  isReady.mockReturnValue(true)
  currentRoute.mockReturnValue({ key: name, name } as ReturnType<typeof navigationRef.getCurrentRoute>)
}

beforeEach(() => {
  navigate.mockClear()
  onScreen('Tabs')
})

describe('ouverture de la cible d\'une notification', () => {
  it.each([
    ['ORDER', 'order-1', ['Orders']],
    ['CONVERSATION', 'user-7', ['Conversation', { partnerId: 'user-7' }]],
    ['PRODUCER', 'producer-3', ['ProducerProfile', { producerId: 'producer-3' }]],
  ] as const)('%s ouvre le bon écran', (type, id, expected) => {
    openNotificationTarget(type, id)
    expect(navigate).toHaveBeenCalledWith(...expected)
  })

  it('ignore une notification sans cible et attend la fin du démarrage avant d\'ouvrir la cible', () => {
    openNotificationTarget(null, null)
    expect(navigate).not.toHaveBeenCalled()

    onScreen('Splash')
    openNotificationTarget('PRODUCER', 'producer-3')
    expect(navigate).not.toHaveBeenCalled()

    onScreen('Tabs')
    flushPendingNotificationTarget()
    expect(navigate).toHaveBeenCalledWith('ProducerProfile', { producerId: 'producer-3' })
  })
})
