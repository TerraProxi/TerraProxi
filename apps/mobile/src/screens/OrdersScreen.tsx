import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'

interface Order {
  id: string
  producer_name?: string
  status: string
  total_price: number
  created_at: string
  items?: { product_name: string; quantity: number }[]
}

type Nav = StackNavigationProp<RootStackParamList>

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#FEF3C7', PAID: '#DBEAFE', PREPARING: '#DBEAFE',
  READY: '#DCFCE7', COMPLETED: '#DCFCE7', CANCELLED: '#FEE2E2',
}
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', PAID: 'Payée', PREPARING: 'En préparation',
  READY: 'Prête', COMPLETED: 'Terminée', CANCELLED: 'Annulée',
}

export function OrdersScreen() {
  const nav = useNavigation<Nav>()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Order[]>('/orders').then(({ data }) => setOrders(data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#5BAE6A" size="large" /></View>

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 80 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 16 }}>Aucune commande</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.producer}>{item.producer_name ?? 'Producteur'}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#F3F4F6' }]}>
              <Text style={styles.badgeText}>{STATUS_LABELS[item.status] ?? item.status}</Text>
            </View>
          </View>

          <Text style={styles.items} numberOfLines={1}>
            {item.items?.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.total}>{Number(item.total_price).toFixed(2)} €</Text>
            {item.status === 'PENDING' && (
              <TouchableOpacity onPress={() => nav.navigate('Checkout', { orderId: item.id })} style={styles.payBtn}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Payer →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2EEE2' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  producer:  { fontWeight: '700', fontSize: 15, color: '#333', flex: 1 },
  badge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  items:     { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },
  footer:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total:     { fontWeight: '700', fontSize: 18, color: '#5BAE6A' },
  payBtn:    { backgroundColor: '#76CCD6', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
})
