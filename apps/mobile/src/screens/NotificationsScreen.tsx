import { useCallback, useLayoutEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { openNotificationTarget } from '../navigation/navigationRef'
import api, { apiErrorMessage } from '../services/api'
import { useAuthStore } from '../store/auth.store'
import { useNotificationsStore } from '../store/notifications.store'
import { useFocusLoader } from '../hooks/useFocusLoader'
import { LoadingState, MessageState } from '../components/ScreenState'
import type { IconName } from '../components/IconButton'
import type { AppNotification, NotificationType } from '../types/notification'
import { Colors, Fonts, MIN_TOUCH_TARGET, Radius, Spacing } from '../theme'

type Props = StackScreenProps<RootStackParamList, 'Notifications'>

const NOTIFICATIONS_PAGE_SIZE = 50

const TYPE_ICONS: Record<NotificationType, IconName> = {
  NEW_ORDER: 'basket-plus-outline',
  ORDER_STATUS: 'package-variant',
  PAYMENT: 'credit-card-outline',
  NEW_MESSAGE: 'chat-outline',
  NEWSLETTER: 'email-newsletter',
  ACCOUNT: 'check-decagram',
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === new Date().toDateString()) return `Aujourd'hui · ${time}`
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${time}`
}

/** EPIC 7 : notifications in-app (GET /notifications), ouvertes vers leur cible. */
export function NotificationsScreen({ navigation }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount)
  const refreshUnread = useNotificationsStore((s) => s.refresh)
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    const { data } = await api.get<AppNotification[]>('/notifications', { params: { limit: NOTIFICATIONS_PAGE_SIZE } })
    setNotifications(data)
    void refreshUnread()
  }, [isAuthenticated, refreshUnread])
  const { isLoading, isRefreshing, error, refresh, reload } = useFocusLoader(load, 'Impossible de charger vos notifications')

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      Alert.alert('Action impossible', apiErrorMessage(err))
    }
  }, [setUnreadCount])

  const hasUnread = notifications.some((n) => !n.is_read) || unreadCount > 0

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (hasUnread ? (
        <TouchableOpacity
          onPress={() => void markAllRead()}
          style={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Tout marquer comme lu"
        >
          <Text style={styles.headerActionText}>Tout lire</Text>
        </TouchableOpacity>
      ) : null),
    })
  }, [navigation, hasUnread, markAllRead])

  const open = async (notification: AppNotification) => {
    if (!notification.is_read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)))
      setUnreadCount(unreadCount - 1)
      // Échec sans gravité : la notification restera non lue au prochain chargement
      api.patch(`/notifications/${notification.id}/read`).catch(() => undefined)
    }
    openNotificationTarget(notification.target_type, notification.target_id)
  }

  if (!isAuthenticated) {
    return <MessageState icon="bell-outline" title="Connectez-vous" message="Retrouvez ici le suivi de vos commandes et vos messages." actionLabel="Se connecter" onAction={() => navigation.navigate('Login')} />
  }
  if (isLoading) return <LoadingState />
  if (error && notifications.length === 0) {
    return <MessageState icon="wifi-off" title="Notifications indisponibles" message={error} actionLabel="Réessayer" onAction={reload} />
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[Colors.primaryDark]} />}
      ListEmptyComponent={<MessageState icon="bell-outline" title="Aucune notification" message="Le suivi de vos commandes et vos nouveaux messages apparaîtront ici." />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, !item.is_read && styles.rowUnread]}
          onPress={() => void open(item)}
          disabled={!item.target_type && item.is_read}
          accessibilityRole="button"
          accessibilityLabel={`${item.is_read ? '' : 'Non lue. '}${item.title}. ${item.body}`}
          accessibilityHint={item.target_type ? 'Ouvre le détail' : undefined}
        >
          <View style={styles.icon}>
            <MaterialCommunityIcons name={TYPE_ICONS[item.type]} size={22} color={Colors.primaryDark} />
          </View>
          <View style={styles.texts}>
            <Text style={[styles.title, !item.is_read && styles.titleUnread]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, backgroundColor: Colors.gray50 },
  headerAction: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  headerActionText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.primaryDark },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.lg,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  rowUnread: { backgroundColor: Colors.green50 },
  icon: {
    width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  texts: { flex: 1 },
  title: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.dark },
  titleUnread: { fontFamily: Fonts.bold },
  body: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray700, marginTop: 2 },
  date: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray600, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primaryDark, marginTop: 6 },
})
