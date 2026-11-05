import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../store/auth.store'
import { useNotificationsStore } from '../store/notifications.store'
import { useUnreadStore } from '../store/unread.store'
import { registerPushToken } from '../services/pushNotifications'
import { isNotificationTarget, openNotificationTarget } from '../navigation/navigationRef'

/** getLastNotificationResponseAsync renvoie toujours la même réponse : on ne l'ouvre qu'une fois. */
let lastHandledResponseId: string | null = null

/** Ouvre l'écran correspondant au data { target_type, target_id } d'une notification push. */
function openFromResponse(response: Notifications.NotificationResponse) {
  const responseId = response.notification.request.identifier
  if (responseId === lastHandledResponseId) return
  lastHandledResponseId = responseId
  const data = response.notification.request.content.data as { target_type?: unknown; target_id?: unknown }
  if (!isNotificationTarget(data.target_type)) return
  openNotificationTarget(data.target_type, typeof data.target_id === 'string' ? data.target_id : null)
}

/**
 * NOTIF-4 : enregistre le jeton push une fois connecté, met les badges à jour à la réception
 * et ouvre la cible quand l'utilisateur touche une notification (application ouverte ou fermée).
 */
export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const refreshNotifications = useNotificationsStore((s) => s.refresh)
  const refreshUnreadMessages = useUnreadStore((s) => s.refresh)

  useEffect(() => {
    if (!isAuthenticated) return
    // Sans push (simulateur, permission système indisponible), l'application reste utilisable :
    // les notifications in-app et leurs badges fonctionnent sans jeton.
    registerPushToken().catch(() => undefined)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    const received = Notifications.addNotificationReceivedListener(() => {
      void refreshNotifications()
      void refreshUnreadMessages()
    })
    const tapped = Notifications.addNotificationResponseReceivedListener(openFromResponse)
    // Application lancée par l'appui sur une notification
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openFromResponse(response)
    })
    return () => {
      received.remove()
      tapped.remove()
    }
  }, [isAuthenticated, refreshNotifications, refreshUnreadMessages])
}
