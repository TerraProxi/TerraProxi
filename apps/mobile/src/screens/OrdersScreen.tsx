import { useCallback, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api, { apiErrorMessage } from '../services/api'
import { useAuthStore } from '../store/auth.store'
import { useFocusLoader } from '../hooks/useFocusLoader'
import { LoadingState, MessageState } from '../components/ScreenState'
import { PrimaryButton } from '../components/PrimaryButton'
import type { Order, OrderStatus } from '../types/order'
import { Colors, Fonts } from '../theme'

type Nav = StackNavigationProp<RootStackParamList>

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: '#FEF3C7', PAID: '#DBEAFE', PREPARING: '#DBEAFE',
  READY: '#DCFCE7', COMPLETED: '#DCFCE7', CANCELLED: '#FEE2E2',
}
const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente de paiement', PAID: 'Payée', PREPARING: 'En préparation',
  READY: 'Prête', COMPLETED: 'Terminée', CANCELLED: 'Annulée',
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export function OrdersScreen() {
  const nav = useNavigation<Nav>()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [orders, setOrders] = useState<Order[]>([])
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    const { data } = await api.get<Order[]>('/orders')
    setOrders(data)
  }, [isAuthenticated])
  const { isLoading, isRefreshing, error, refresh, reload } = useFocusLoader(load, 'Impossible de charger vos commandes')

  const cancelOrder = async (order: Order) => {
    setCancellingId(order.id)
    try {
      await api.patch(`/orders/${order.id}/status`, { status: 'CANCELLED' })
      await refresh()
    } catch (err) {
      Alert.alert('Annulation impossible', apiErrorMessage(err, 'La commande n\'a pas pu être annulée'))
    } finally {
      setCancellingId(null)
    }
  }

  const confirmCancel = (order: Order) => {
    Alert.alert(
      'Annuler la commande',
      `Annuler votre commande chez ${order.producer_name ?? 'ce producteur'} (${Number(order.total_price).toFixed(2)} €) ?`,
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Annuler la commande', style: 'destructive', onPress: () => void cancelOrder(order) },
      ],
    )
  }

  if (!isAuthenticated) {
    return <MessageState icon="package-variant" title="Connectez-vous" message="Retrouvez ici vos commandes." actionLabel="Se connecter" onAction={() => nav.navigate('Login')} />
  }
  if (isLoading) return <LoadingState />
  if (error && orders.length === 0) {
    return <MessageState icon="wifi-off" title="Commandes indisponibles" message={error} actionLabel="Réessayer" onAction={reload} />
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[Colors.primaryDark]} />}
      ListEmptyComponent={<MessageState icon="package-variant" title="Aucune commande" message="Vos commandes passées apparaîtront ici." />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.producer} numberOfLines={1}>{item.producer_name ?? 'Producteur'}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
              <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
            </View>
          </View>
          <Text style={styles.date}>Commandée le {formatDate(item.created_at)}</Text>
          <Text style={styles.items} numberOfLines={2}>
            {item.items?.map((i) => `${i.quantity} × ${i.product_name}`).join(', ')}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.total}>{Number(item.total_price).toFixed(2)} €</Text>
          </View>
          {item.status === 'PENDING' && (
            <View style={styles.actions}>
              <PrimaryButton
                label="Annuler"
                variant="danger"
                onPress={() => confirmCancel(item)}
                isLoading={cancellingId === item.id}
                style={styles.action}
              />
              <PrimaryButton
                label="Payer"
                onPress={() => nav.navigate('Checkout', { orderId: item.id })}
                disabled={cancellingId === item.id}
                style={styles.action}
              />
            </View>
          )}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  producer: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.dark, flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 },
  badgeText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.dark },
  date: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray600, marginBottom: 6 },
  items: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.gray700, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontFamily: Fonts.title, fontSize: 18, color: Colors.primaryDark },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  action: { flex: 1 },
})
