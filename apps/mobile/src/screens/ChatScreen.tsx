import { useState, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors } from '../theme'
import api from '../services/api'

type Props = StackScreenProps<RootStackParamList, 'Conversation'>

interface ApiMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  image_url?: string
}

interface LocalMessage {
  id: string
  sender: 'user' | 'partner'
  text: string
  timestamp: string
  image?: string
  pending?: boolean
}

const QUICK_REPLIES = ["C'est prêt ?", 'Encore du stock ?', 'Merci beaucoup !', 'À quelle heure ?']

export function ChatScreen({ route, navigation }: Props) {
  const { partnerId, partnerName } = route.params
  const listRef = useRef<FlatList>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')

  useEffect(() => {
    api.get<ApiMessage[]>(`/messages/${partnerId}`)
      .then(({ data }) => {
        setMessages(
          data.map((m) => ({
            id: m.id,
            sender: m.sender_id === partnerId ? 'partner' : 'user',
            text: m.content,
            timestamp: m.created_at,
            image: m.image_url,
          })),
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [partnerId])

  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }

  const handleSend = async () => {
    if (!text.trim()) return

    const content = text.trim()
    const optimistic: LocalMessage = {
      id: `pending-${Date.now()}`,
      sender: 'user',
      text: content,
      timestamp: new Date().toISOString(),
      pending: true,
    }

    setMessages((prev) => [...prev, optimistic])
    setText('')
    scrollToBottom()

    try {
      const { data } = await api.post<ApiMessage>('/messages', {
        receiver_id: partnerId,
        content,
      })
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? { id: data.id, sender: 'user', text: data.content, timestamp: data.created_at }
            : m,
        ),
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false } : m)),
      )
    }
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
  }

  const renderMessage = ({ item, index }: { item: LocalMessage; index: number }) => {
    const isUser = item.sender === 'user'
    const showAvatar = !isUser && (index === 0 || messages[index - 1]?.sender === 'user')

    return (
      <View style={{ marginBottom: 8 }}>
        {showAvatar && (
          <View style={styles.avatarRow}>
            <View style={styles.msgAvatarFallback}>
              <Text style={styles.msgAvatarLetter}>{partnerName[0]}</Text>
            </View>
            <Text style={styles.avatarName}>{partnerName}</Text>
          </View>
        )}
        <View style={[isUser ? styles.userRow : styles.producerRow, !showAvatar && !isUser && { marginLeft: 44 }]}>
          {!isUser && !showAvatar && <View style={{ width: 44 }} />}
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.msgImage} />
          ) : (
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.producerBubble]}>
              <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.text}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.avatarContainer}>
          <View style={styles.headerAvatarFallback}>
            <Text style={styles.headerAvatarLetter}>{partnerName[0]}</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{partnerName}</Text>
          <Text style={styles.headerSubtitle}>Producteur Bio</Text>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <MaterialCommunityIcons name="phone" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.orderBar}>
        <MaterialCommunityIcons name="basket" size={18} color={Colors.blue600} />
        <Text style={styles.orderBarText} numberOfLines={1}>
          Réf: Commande #2390 · Panier Légumes
        </Text>
        <TouchableOpacity>
          <Text style={styles.orderBarLink}>Voir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateSeparator}>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>Aujourd'hui</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReplies} contentContainerStyle={styles.quickRepliesContent}>
        {QUICK_REPLIES.map((qr) => (
          <TouchableOpacity
            key={qr}
            style={styles.quickPill}
            onPress={() => {
              setText(qr)
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.quickPillText}>{qr}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.plusBtn}>
          <MaterialCommunityIcons name="plus" size={22} color={Colors.gray600} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          style={styles.input}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
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
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green500,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerInfo: {
    flex: 1,
    gap: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray500,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.green50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  orderBarText: {
    flex: 1,
    fontSize: 13,
    color: Colors.blue600,
    fontWeight: '500',
  },
  orderBarLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue600,
  },
  dateSeparator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  datePill: {
    backgroundColor: Colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray600,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  msgAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgAvatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  avatarName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
  },
  producerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  producerBubble: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    color: Colors.gray700,
  },
  userBubbleText: {
    color: Colors.white,
  },
  msgImage: {
    width: 200,
    height: 160,
    borderRadius: 14,
    backgroundColor: Colors.gray200,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.gray400,
    marginTop: 2,
  },
  timestampLeft: {
    marginLeft: 44,
  },
  timestampRight: {
    textAlign: 'right',
  },
  quickReplies: {
    maxHeight: 44,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  quickRepliesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  quickPill: {
    backgroundColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  quickPillText: {
    fontSize: 13,
    color: Colors.gray700,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.gray100,
    borderRadius: 28,
    marginHorizontal: 12,
    marginVertical: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 6,
    color: Colors.dark,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray300,
  },
})
