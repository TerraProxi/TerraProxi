import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from './RootNavigator'
import type { NotificationTargetType } from '../types/notification'

/** Référence de navigation : permet d'ouvrir un écran depuis une notification push. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>()

const TARGET_TYPES: readonly NotificationTargetType[] = ['ORDER', 'CONVERSATION', 'PRODUCER']
/** Écrans de démarrage : ils remplacent la pile en sortant, une cible ouverte avant serait perdue. */
const STARTUP_ROUTES: readonly string[] = ['Splash', 'Onboarding']

interface Target { type: NotificationTargetType; id: string | null }
let pendingTarget: Target | null = null

export const isNotificationTarget = (value: unknown): value is NotificationTargetType =>
  typeof value === 'string' && (TARGET_TYPES as readonly string[]).includes(value)

function navigateTo({ type, id }: Target) {
  switch (type) {
    case 'ORDER':
      navigationRef.navigate('Orders')
      return
    case 'CONVERSATION':
      if (id) navigationRef.navigate('Conversation', { partnerId: id })
      return
    case 'PRODUCER':
      if (id) navigationRef.navigate('ProducerProfile', { producerId: id })
  }
}

const isNavigationSettled = () =>
  navigationRef.isReady() && !STARTUP_ROUTES.includes(navigationRef.getCurrentRoute()?.name ?? 'Splash')

/**
 * Ouvre l'écran visé par une notification (in-app ou push) : commandes, conversation
 * avec l'interlocuteur target_id, ou fiche du producteur target_id. Pendant le démarrage,
 * la cible est mise de côté puis ouverte par flushPendingNotificationTarget.
 */
export function openNotificationTarget(type: NotificationTargetType | null, id: string | null) {
  if (!type) return
  if (!isNavigationSettled()) {
    pendingTarget = { type, id }
    return
  }
  navigateTo({ type, id })
}

/** Appelé à chaque changement d'écran (NavigationContainer.onStateChange). */
export function flushPendingNotificationTarget() {
  if (!pendingTarget || !isNavigationSettled()) return
  const target = pendingTarget
  pendingTarget = null
  navigateTo(target)
}
