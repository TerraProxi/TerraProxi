import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'

interface Conversation {
  partner_id: string
  partner_name: string
  last_content: string
  unread_count: number
}

type Nav = StackNavigationProp<RootStackParamList>

export function MessagesScreen() {
  const nav = useNavigation<Nav>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Conversation[]>('/messages').then(({ data }) => setConversations(data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#5BAE6A" />

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.partner_id}
      ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: '#9CA3AF' }}>Aucune conversation</Text></View>}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => nav.navigate('Conversation', { partnerId: item.partner_id, partnerName: item.partner_name })} style={styles.row}>
          <View style={styles.avatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.partner_name}</Text>
            <Text style={styles.preview} numberOfLines={1}>{item.last_content}</Text>
          </View>
          {item.unread_count > 0 && (
            <View style={styles.badge}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.unread_count}</Text></View>
          )}
        </TouchableOpacity>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2EEE2', gap: 12, backgroundColor: '#fff' },
  avatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBF8F0', justifyContent: 'center', alignItems: 'center' },
  name:    { fontWeight: '700', fontSize: 15, color: '#333' },
  preview: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  badge:   { backgroundColor: '#76CCD6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
})
