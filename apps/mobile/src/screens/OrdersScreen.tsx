import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'
import { useUiStore } from '../store/ui.store'
import { useAuthStore } from '../store/auth.store'
import { Colors } from '../theme'

interface Order {
  id: string
  producer_name?: string
  status: string
  total_price: number
  created_at: string
  items?: { product_name: string; quantity: number }[]
}

type Nav = StackNavigationProp<RootStackParamList>

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#92400E', label: 'En attente' },
  PAID: { bg: '#DBEAFE', text: '#1E40AF', label: 'Payée' },
  PREPARING: { bg: '#EDE9FE', text: '#5B21B6', label: 'En préparation' },
  READY: { bg: '#DCFCE7', text: '#166534', label: 'Prête' },
  COMPLETED: { bg: '#D1FAE5', text: '#065F46', label: 'Terminée' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B', label: 'Annulée' },
}

export function OrdersScreen() {
  const nav = useNavigation<Nav>()
  const isDarkMode = useUiStore((s) => s.isDarkMode)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get<Order[]>('/orders')
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchOrders()
    }, [fetchOrders])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const bg = isDarkMode ? '#111827' : '#F9FAFB'
  const cardBg = isDarkMode ? '#1F2937' : '#FFFFFF'
  const borderColor = isDarkMode ? '#374151' : '#E5E7EB'
  const textColor = isDarkMode ? '#F9FAFB' : '#111827'
  const subtextColor = isDarkMode ? '#9CA3AF' : '#6B7280'

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    )
  }

  if (!isAuthenticated && orders.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: bg, padding: 24 }]}>
        <MaterialCommunityIcons name="account-lock-outline" size={64} color={subtextColor} />
        <Text style={[styles.emptyTitle, { color: textColor, marginTop: 16 }]}>Connexion requise</Text>
        <Text style={[styles.emptySubtitle, { color: subtextColor, textAlign: 'center', marginBottom: 20 }]}>
          Connectez-vous pour consulter l'historique et le suivi de vos commandes.
        </Text>
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: Colors.primary }]}
          onPress={() => nav.navigate('Auth', {})}
        >
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant" size={64} color={subtextColor} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>Aucune commande</Text>
            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
              Vos commandes locales apparaîtront ici dès que vous aurez validé un panier.
            </Text>
            <TouchableOpacity
              style={[styles.shopBtn, { backgroundColor: Colors.primary }]}
              onPress={() => nav.navigate('Main')}
            >
              <Text style={styles.shopBtnText}>Découvrir les producteurs</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status] ?? {
            bg: isDarkMode ? '#374151' : '#F3F4F6',
            text: subtextColor,
            label: item.status,
          }
          const dateStr = item.created_at
            ? new Date(item.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''

          return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.producer, { color: textColor }]}>
                    {item.producer_name ?? 'Producteur'}
                  </Text>
                  {dateStr ? <Text style={[styles.date, { color: subtextColor }]}>{dateStr}</Text> : null}
                </View>
                <View style={[styles.badge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
                </View>
              </View>

              <Text style={[styles.items, { color: subtextColor }]} numberOfLines={2}>
                {item.items && item.items.length > 0
                  ? item.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')
                  : 'Articles divers'}
              </Text>

              <View style={styles.footer}>
                <View>
                  <Text style={[styles.totalLabel, { color: subtextColor }]}>Total payé</Text>
                  <Text style={[styles.total, { color: Colors.primary }]}>
                    {Number(item.total_price).toFixed(2)} €
                  </Text>
                </View>
                {item.status === 'PENDING' && (
                  <TouchableOpacity
                    onPress={() => nav.navigate('Checkout', { orderId: item.id })}
                    style={[styles.payBtn, { backgroundColor: Colors.accent }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Payer →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  producer: { fontWeight: '700', fontSize: 16 },
  date: { fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  items: { fontSize: 14, marginBottom: 14, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#E5E7EB22' },
  totalLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  total: { fontWeight: '800', fontSize: 19 },
  payBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  shopBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loginBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})

