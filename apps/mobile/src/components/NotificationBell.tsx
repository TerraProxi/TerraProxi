import { useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useAuthStore } from '../store/auth.store'
import { useNotificationsStore } from '../store/notifications.store'
import { IconButton } from './IconButton'
import { Colors, Fonts } from '../theme'

const MAX_BADGE = 99

/** Cloche des notifications in-app avec le nombre de non-lues ; masquée hors connexion. */
export function NotificationBell() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const refresh = useNotificationsStore((s) => s.refresh)

  useFocusEffect(useCallback(() => { void refresh() }, [refresh]))

  if (!isAuthenticated) return null

  const label = unreadCount > 0
    ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
    : 'Notifications'

  return (
    <View>
      <IconButton
        icon={unreadCount > 0 ? 'bell-badge-outline' : 'bell-outline'}
        label={label}
        onPress={() => nav.navigate('Notifications')}
        size={26}
      />
      {unreadCount > 0 && (
        <View style={styles.badge} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <Text style={styles.badgeText}>{unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : unreadCount}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 4, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 11, fontFamily: Fonts.bold },
})
