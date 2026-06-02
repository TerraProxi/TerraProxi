import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import * as Location from 'expo-location'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Spacing, Radius } from '../theme'
import { AssistantReplyBubble } from '../components/AssistantReplyBubble'
import { ChatMessageText } from '../components/ChatMessageText'
import api from '../services/api'

type Nav = StackNavigationProp<RootStackParamList>

interface ProducerLink {
  producer_id: string
  company_name: string
  reason: string
  city?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  producerLinks?: ProducerLink[]
  pending?: boolean
  error?: boolean
  /** Révélation mot par mot (nouvelles réponses du bot uniquement). */
  animateReply?: boolean
}

interface AiChatResponse {
  reply: string
  producer_links: ProducerLink[]
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Bonjour. Je suis l\'assistant TerraProxi — votre guide pour découvrir '
    + 'les producteurs locaux, leurs produits frais et de saison, '
    + 'et des idées de recettes avec des ingrédients près de chez vous. '
    + 'Que recherchez-vous aujourd\'hui ?',
}

const QUICK_PROMPTS = [
  'Légumes bio près de moi',
  'Fromages locaux',
  'Recette avec des tomates',
  'Fruits de saison',
]

export function AiAssistantScreen() {
  const navigation = useNavigation<Nav>()
  const listRef = useRef<FlatList>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status !== 'granted') return
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      })
      .then((position) => {
        if (!position) return
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      })
      .catch(() => {})
  }, [])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  const buildHistory = (currentMessages: ChatMessage[]) =>
    currentMessages
      .filter((m) => m.role !== 'assistant' || m.id !== 'welcome')
      .filter((m) => !m.pending && !m.error)
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.text,
      }))

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    }

    const pendingAssistant: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'assistant',
      text: '',
      pending: true,
    }

    setMessages((prev) => [...prev, userMessage, pendingAssistant])
    setText('')
    setIsSending(true)
    scrollToBottom()

    try {
      const { data } = await api.post<AiChatResponse>(
        '/ai/chat',
        {
          message: trimmed,
          history: buildHistory([...messages, userMessage]),
          ...(location ? { lat: location.lat, lon: location.lon, radius_km: 50 } : {}),
        },
        { timeout: 60_000 },
      )

      const assistantId = `assistant-${Date.now()}`
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingAssistant.id
            ? {
              id: assistantId,
              role: 'assistant',
              text: data.reply,
              producerLinks: data.producer_links,
              animateReply: true,
            }
            : m,
        ),
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingAssistant.id
            ? {
              id: `error-${Date.now()}`,
              role: 'assistant',
              text:
                'Désolé, je ne peux pas répondre pour le moment. '
                + 'Vérifiez votre connexion ou réessayez dans un instant.',
              error: true,
            }
            : m,
        ),
      )
    } finally {
      setIsSending(false)
      scrollToBottom()
    }
  }

  const openProducer = (producerId: string) => {
    navigation.navigate('ProducerProfile', { producerId })
  }

  const hasConversation = messages.some(
    (m) => m.id !== 'welcome' && !m.pending,
  )

  const handleAnimationComplete = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, animateReply: false } : m,
      ),
    )
    scrollToBottom()
  }, [scrollToBottom])

  const clearHistory = () => {
    if (!hasConversation || isSending) return

    Alert.alert(
      'Effacer la conversation',
      'Supprimer tous les messages de cette discussion ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            setMessages([WELCOME_MESSAGE])
            setText('')
            scrollToBottom()
          },
        },
      ],
    )
  }

  const renderProducerLinks = (links: ProducerLink[]) => (
    <View style={styles.linksContainer}>
      {links.map((link) => (
        <TouchableOpacity
          key={link.producer_id}
          style={styles.producerCard}
          onPress={() => openProducer(link.producer_id)}
          activeOpacity={0.7}
        >
          <View style={styles.producerCardIcon}>
            <MaterialCommunityIcons name="storefront" size={18} color={Colors.primary} />
          </View>
          <View style={styles.producerCardContent}>
            <Text style={styles.producerCardName}>{link.company_name}</Text>
            {link.city ? (
              <Text style={styles.producerCardCity}>{link.city}</Text>
            ) : null}
            <Text style={styles.producerCardReason} numberOfLines={2}>
              {link.reason}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.gray400} />
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user'

    if (item.pending) {
      return (
        <View style={styles.assistantRow}>
          <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Réflexion en cours…</Text>
          </View>
        </View>
      )
    }

    if (!isUser && item.animateReply) {
      return (
        <AssistantReplyBubble
          text={item.text}
          animate
          producerLinks={item.producerLinks}
          onAnimationComplete={() => handleAnimationComplete(item.id)}
          onScrollRequest={scrollToBottom}
          onOpenProducer={openProducer}
        />
      )
    }

    return (
      <View style={[styles.messageBlock, isUser ? styles.userBlock : styles.assistantBlock]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <MaterialCommunityIcons name="robot-outline" size={16} color={Colors.primary} />
          </View>
        )}
        <View style={isUser ? styles.userContent : styles.assistantContent}>
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
            <ChatMessageText
              text={item.text}
              style={[styles.bubbleText, isUser && styles.userBubbleText]}
              boldStyle={isUser ? styles.userBubbleBold : styles.assistantBubbleBold}
            />
          </View>
          {!isUser && item.producerLinks && item.producerLinks.length > 0
            ? renderProducerLinks(item.producerLinks)
            : null}
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="robot-happy-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Assistant TerraProxi</Text>
          <Text style={styles.headerSubtitle}>
            {location ? 'Producteurs locaux · géolocalisé' : 'Producteurs locaux'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={clearHistory}
          disabled={!hasConversation || isSending}
          style={[
            styles.clearHistoryBtn,
            (!hasConversation || isSending) && styles.clearHistoryBtnDisabled,
          ]}
          accessibilityLabel="Effacer la conversation"
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={22}
            color={hasConversation && !isSending ? Colors.gray700 : Colors.gray300}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={scrollToBottom}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.quickPromptsSection}>
        <Text style={styles.quickPromptsLabel}>Suggestions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsContent}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={[styles.quickPill, isSending && styles.quickPillDisabled]}
              onPress={() => sendMessage(prompt)}
              disabled={isSending}
              activeOpacity={0.7}
            >
              <Text style={styles.quickPillText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Cherchez un producteur, une recette…"
          style={styles.input}
          multiline
          maxLength={2000}
          editable={!isSending}
        />
        <TouchableOpacity
          onPress={() => sendMessage(text)}
          disabled={!text.trim() || isSending}
          style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="send" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.xxl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray500,
  },
  clearHistoryBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
  },
  clearHistoryBtnDisabled: {
    backgroundColor: Colors.gray50,
  },
  messageList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  messageBlock: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  userBlock: {
    justifyContent: 'flex-end',
  },
  assistantBlock: {
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  userContent: {
    maxWidth: '82%',
    alignSelf: 'flex-end',
  },
  assistantContent: {
    flex: 1,
    maxWidth: '88%',
  },
  assistantRow: {
    marginBottom: Spacing.md,
    marginLeft: 36,
  },
  bubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderBottomLeftRadius: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.gray800,
  },
  userBubbleText: {
    color: Colors.white,
  },
  userBubbleBold: {
    color: Colors.white,
    fontWeight: '700',
  },
  assistantBubbleBold: {
    color: Colors.gray900,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  linksContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  producerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  producerCardIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  producerCardContent: {
    flex: 1,
    gap: 2,
  },
  producerCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  producerCardCity: {
    fontSize: 12,
    color: Colors.gray500,
  },
  producerCardReason: {
    fontSize: 12,
    color: Colors.gray600,
    marginTop: 2,
  },
  quickPromptsSection: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  quickPromptsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  quickPromptsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  quickPill: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    marginRight: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  quickPillDisabled: {
    opacity: 0.5,
  },
  quickPillText: {
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.xl,
    color: Colors.dark,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray300,
  },
})
