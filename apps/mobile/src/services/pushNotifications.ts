import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import api from './api'

const ANDROID_CHANNEL_ID = 'default'

// Une notification reçue application ouverte s'affiche quand même (bannière et son)
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
})

/** Identifiant EAS (app.config.ts → extra.eas.projectId), exigé par getExpoPushTokenAsync. */
function easProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null
}

async function hasPushPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  return (await Notifications.requestPermissionsAsync()).granted
}

/**
 * NOTIF-4 : demande l'autorisation puis enregistre le jeton Expo Push du téléphone
 * (PUT /users/me/push-token). Sans projectId EAS (Expo Go, build non initialisé), ne fait rien.
 * Une autorisation refusée retire le jeton éventuellement enregistré.
 */
export async function registerPushToken(): Promise<void> {
  const projectId = easProjectId()
  if (!projectId) return
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Notifications TerraProxi',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  if (!(await hasPushPermission())) {
    await api.put('/users/me/push-token', { token: null })
    return
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  await api.put('/users/me/push-token', { token })
}

/** À la déconnexion, avant la révocation de la session : ce téléphone ne reçoit plus les push du compte. */
export async function unregisterPushToken(): Promise<void> {
  await api.put('/users/me/push-token', { token: null })
}
