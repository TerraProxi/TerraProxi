import { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { StackScreenProps } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Fonts, MIN_TOUCH_TARGET } from '../theme'
import api, { apiErrorMessage } from '../services/api'
import { useAuthStore } from '../store/auth.store'
import { useUnreadStore } from '../store/unread.store'
import { IconButton } from '../components/IconButton'
import { MessageState } from '../components/ScreenState'

type Props = StackScreenProps<RootStackParamList, 'Conversation'>

/** specs/schemas/message.schema.json */
interface ApiMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  sent_at: string
  first_name?: string
  last_name?: string
}

type DeliveryStatus = 'sent' | 'sending' | 'failed'

interface ChatMessage {
  id: string
  isMine: boolean
  text: string
  sentAt: string
  status: DeliveryStatus
}

const POLL_INTERVAL_MS = 10_000
const MAX_MESSAGE_LENGTH = 4000
const DEFAULT_PARTNER_NAME = 'Conversation'

interface ConversationSummary {
  partner_id: string
  partner_name: string
}

const QUICK_REPLIES = ["C'est prêt ?", 'Encore du stock ?', 'Merci beaucoup !', 'À quelle heure ?']

const toChatMessage = (m: ApiMessage, partnerId: string): ChatMessage => ({
  id: m.id,
  isMine: m.sender_id !== partnerId,
  text: m.content,
  sentAt: m.sent_at,
  status: 'sent',
})

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === new Date().toDateString()) return time
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${time}`
}

export function ChatScreen({ route, navigation }: Props) {
  const { partnerId } = route.params
  const [partnerName, setPartnerName] = useState(route.params.partnerName ?? DEFAULT_PARTNER_NAME)
  const insets = useSafeAreaInsets()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const refreshUnread = useUnreadStore((s) => s.refresh)
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const [serverMessages, setServerMessages] = useState<ChatMessage[]>([])
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [isLoading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [text, setText] = useState('')

  const loadThread = useCallback(async () => {
    try {
      const { data } = await api.get<ApiMessage[]>(`/messages/${partnerId}`)
      setServerMessages(data.map((m) => toChatMessage(m, partnerId)))
      setLoadError(null)
      // Ouvrir le fil marque les messages comme lus : le badge global doit suivre
      void refreshUnread()
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Impossible de charger la conversation'))
    } finally {
      setLoading(false)
    }
  }, [partnerId, refreshUnread])

  // Ouverte depuis une notification : le nom de l'interlocuteur vient de la boîte de réception
  useEffect(() => {
    if (route.params.partnerName || !isAuthenticated) return
    api.get<ConversationSummary[]>('/messages')
      .then(({ data }) => {
        const name = data.find((c) => c.partner_id === partnerId)?.partner_name
        if (name) setPartnerName(name)
      })
      .catch(() => undefined) // le libellé générique reste affiché
  }, [route.params.partnerName, partnerId, isAuthenticated])

  // Chargement puis rafraîchissement périodique tant que la conversation est affichée
  useFocusEffect(useCallback(() => {
    if (!isAuthenticated) return undefined
    void loadThread()
    const timer = setInterval(() => { void loadThread() }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isAuthenticated, loadThread]))

  const send = async (content: string, localId: string) => {
    setLocalMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: 'sending' } : m)))
    try {
      const { data } = await api.post<ApiMessage>('/messages', { receiver_id: partnerId, content })
      setLocalMessages((prev) => prev.filter((m) => m.id !== localId))
      setServerMessages((prev) => [...prev, toChatMessage(data, partnerId)])
    } catch {
      setLocalMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, status: 'failed' } : m)))
    }
  }

  const handleSend = () => {
    const content = text.trim()
    if (!content) return
    const localId = `local-${Date.now()}`
    setLocalMessages((prev) => [
      ...prev,
      { id: localId, isMine: true, text: content, sentAt: new Date().toISOString(), status: 'sending' },
    ])
    setText('')
    void send(content, localId)
  }

  const messages = [...serverMessages, ...localMessages]

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <MessageState
          icon="chat-outline"
          title="Connectez-vous pour discuter"
          message={`La messagerie avec ${partnerName} est réservée aux comptes connectés.`}
          actionLabel="Se connecter"
          onAction={() => navigation.navigate('Login')}
        />
      </View>
    )
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={styles.messageBlock}>
      <TouchableOpacity
        disabled={item.status !== 'failed'}
        onPress={() => void send(item.text, item.id)}
        style={[styles.bubble, item.isMine ? styles.myBubble : styles.partnerBubble, item.status === 'failed' && styles.failedBubble]}
        accessibilityRole={item.status === 'failed' ? 'button' : 'text'}
        accessibilityHint={item.status === 'failed' ? 'Toucher pour renvoyer le message' : undefined}
      >
        <Text style={[styles.bubbleText, item.isMine && item.status !== 'failed' && styles.myBubbleText]}>
          {item.text}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.meta, item.isMine && styles.metaRight, item.status === 'failed' && styles.metaFailed]}>
        {item.status === 'sending' && 'Envoi…'}
        {item.status === 'failed' && 'Échec de l\'envoi · toucher pour réessayer'}
        {item.status === 'sent' && formatTimestamp(item.sentAt)}
      </Text>
    </View>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="arrow-left" label="Retour" onPress={() => navigation.goBack()} size={24} />
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{partnerName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">{partnerName}</Text>
      </View>

      {loadError && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => void loadThread()} accessibilityRole="button">
          <Text style={styles.errorText}>{loadError} · Réessayer</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primaryDark} accessibilityLabel="Chargement" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={renderMessage}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun message. Écrivez à {partnerName} ci-dessous.</Text>
          }
        />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickReplies}
        contentContainerStyle={styles.quickRepliesContent}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_REPLIES.map((reply) => (
          <TouchableOpacity
            key={reply}
            style={styles.quickPill}
            onPress={() => setText(reply)}
            accessibilityRole="button"
            accessibilityHint="Insère cette réponse dans le message"
          >
            <Text style={styles.quickPillText}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.inputContainer, { marginBottom: insets.bottom + 10 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          placeholderTextColor={Colors.gray600}
          style={styles.input}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          accessibilityLabel={`Message à ${partnerName}`}
        />
        <IconButton
          icon="send"
          label="Envoyer"
          onPress={handleSend}
          disabled={!text.trim()}
          color={Colors.white}
          size={18}
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.primaryDark },
  headerName: { flex: 1, fontSize: 16, fontFamily: Fonts.title, color: Colors.dark },
  errorBanner: { backgroundColor: Colors.red50, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.danger },
  messageList: { padding: 16, flexGrow: 1 },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.gray600, textAlign: 'center', marginTop: 40 },
  messageBlock: { marginBottom: 10 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  partnerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderBottomLeftRadius: 4,
  },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primaryDark, borderBottomRightRadius: 4 },
  failedBubble: { backgroundColor: Colors.red50, borderWidth: 1, borderColor: Colors.danger },
  bubbleText: { fontSize: 15, lineHeight: 20, fontFamily: Fonts.regular, color: Colors.gray800 },
  myBubbleText: { color: Colors.white },
  meta: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.gray600, marginTop: 3 },
  metaRight: { textAlign: 'right' },
  metaFailed: { color: Colors.danger, fontFamily: Fonts.semibold },
  quickReplies: {
    maxHeight: 56,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  quickRepliesContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: 'center' },
  quickPill: {
    backgroundColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  quickPillText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.gray700 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.gray100,
    borderRadius: 28,
    marginHorizontal: 12,
    marginTop: 10,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.regular,
    maxHeight: 100,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 10,
    color: Colors.dark,
  },
  sendBtn: { borderRadius: 22, backgroundColor: Colors.primaryDark },
  sendBtnDisabled: { backgroundColor: Colors.gray400 },
})
