import { useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'
import { useAuthStore } from '../store/auth.store'

type Props = StackScreenProps<RootStackParamList, 'Conversation'>

interface Message {
  id: string; sender_id: string; content: string; sent_at: string
}

export function ConversationScreen({ route }: Props) {
  const { partnerId } = route.params
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    api.get<Message[]>(`/messages/${partnerId}`).then(({ data }) => setMessages(data))
  }, [partnerId])

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    const { data } = await api.post<Message>('/messages', { receiver_id: partnerId, content: text.trim() })
    setMessages((m) => [...m, data])
    setText('')
    setSending(false)
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id
          return (
            <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                <Text style={{ color: isMe ? '#fff' : '#333', fontSize: 15 }}>{item.content}</Text>
              </View>
            </View>
          )
        }}
      />
      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} placeholder="Votre message…" style={styles.input} multiline />
        <TouchableOpacity onPress={send} disabled={sending || !text.trim()} style={styles.sendBtn}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  bubble:      { maxWidth: '70%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  myBubble:    { backgroundColor: '#76CCD6', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2EEE2', borderBottomLeftRadius: 4 },
  inputRow:    { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#E2EEE2', backgroundColor: '#fff' },
  input:       { flex: 1, backgroundColor: '#F6F9F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#5BAE6A', justifyContent: 'center', alignItems: 'center' },
})
