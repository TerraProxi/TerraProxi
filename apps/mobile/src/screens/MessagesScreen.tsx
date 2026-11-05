import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'
import { useUiStore } from '../store/ui.store'
import { useAuthStore } from '../store/auth.store'
import { useUnreadStore } from '../store/unread.store'
import { useFocusLoader } from '../hooks/useFocusLoader'
import { LoadingState, MessageState } from '../components/ScreenState'
import { Colors, Fonts } from '../theme'

/** specs/schemas/message.schema.json#/$defs/Conversation */
interface Conversation {
  partner_id: string
  partner_name: string
  partner_role: 'CONSUMER' | 'PRODUCER' | 'ADMIN'
  last_content: string
  last_sent_at: string
  unread_count: number
}

type Nav = StackNavigationProp<RootStackParamList>

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export function MessagesScreen() {
  const nav = useNavigation<Nav>()
  const darkMode = useUiStore((s) => s.darkMode)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const refreshUnread = useUnreadStore((s) => s.refresh)
  const [conversations, setConversations] = useState<Conversation[]>([])

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    const { data } = await api.get<Conversation[]>('/messages')
    setConversations(data)
    void refreshUnread()
  }, [isAuthenticated, refreshUnread])
  const { isLoading, isRefreshing, error, refresh, reload } = useFocusLoader(load, 'Impossible de charger vos messages')

  if (!isAuthenticated) {
    return (
      <MessageState
        icon="chat-outline"
        title="Connectez-vous"
        message="Retrouvez vos échanges avec les producteurs."
        actionLabel="Se connecter"
        onAction={() => nav.navigate('Login')}
      />
    )
  }
  if (isLoading) return <LoadingState />
  if (error && conversations.length === 0) {
    return <MessageState icon="wifi-off" title="Messages indisponibles" message={error} actionLabel="Réessayer" onAction={reload} />
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.partner_id}
      style={{ backgroundColor: darkMode ? '#0B1220' : Colors.white }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[Colors.primaryDark]} />}
      ListEmptyComponent={
        <MessageState
          icon="chat-outline"
          title="Aucune conversation"
          message="Écrivez à un producteur depuis sa fiche pour démarrer un échange."
        />
      }
      renderItem={({ item }) => {
        const unreadLabel = item.unread_count > 0 ? `, ${item.unread_count} non lu${item.unread_count > 1 ? 's' : ''}` : ''
        return (
          <TouchableOpacity
            onPress={() => nav.navigate('Conversation', { partnerId: item.partner_id, partnerName: item.partner_name })}
            style={[styles.row, darkMode && styles.rowDark]}
            accessibilityRole="button"
            accessibilityLabel={`${item.partner_name}${unreadLabel}. ${item.last_content}`}
          >
            <View style={[styles.avatar, darkMode && styles.avatarDark]}>
              <MaterialCommunityIcons
                name={item.partner_role === 'PRODUCER' ? 'storefront' : 'account'}
                size={22}
                color={Colors.primaryDark}
              />
            </View>
            <View style={styles.texts}>
              <View style={styles.titleRow}>
                <Text style={[styles.name, darkMode && styles.textPrimaryDark]} numberOfLines={1}>{item.partner_name}</Text>
                <Text style={[styles.date, darkMode && styles.textSecondaryDark]}>{formatDate(item.last_sent_at)}</Text>
              </View>
              <Text style={[styles.preview, darkMode && styles.textSecondaryDark]} numberOfLines={1}>{item.last_content}</Text>
            </View>
            {item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </TouchableOpacity>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  texts: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: Fonts.bold, fontSize: 15, color: Colors.dark },
  date: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray600 },
  preview: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray600, marginTop: 2 },
  badge: { backgroundColor: Colors.accentDark, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: Colors.white, fontSize: 12, fontFamily: Fonts.bold },
  rowDark: { backgroundColor: '#111827', borderBottomColor: Colors.gray800 },
  avatarDark: { backgroundColor: '#0F172A' },
  textPrimaryDark: { color: Colors.gray100 },
  textSecondaryDark: { color: Colors.gray500 },
})
