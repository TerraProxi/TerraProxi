import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'
import api from '../services/api'

type Nav = StackNavigationProp<RootStackParamList>

export function CartScreen() {
  const { items, total, producerId, remove, updateQty, clear } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const nav = useNavigation<Nav>()

  const handleOrder = async () => {
    if (!isAuthenticated) { nav.navigate('Login'); return }
    if (!producerId || !items.length) return

    try {
      const { data: order } = await api.post('/orders', {
        producer_id: producerId,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      })
      clear()
      nav.navigate('Checkout', { orderId: order.id })
    } catch (err: unknown) {
      Alert.alert('Erreur', 'Impossible de créer la commande')
    }
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 48 }}>🛒</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#333' }}>Panier vide</Text>
        <Text style={{ color: '#9CA3AF' }}>Ajoutez des produits depuis le catalogue</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F9F6' }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.product.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.product.name}</Text>
              <Text style={styles.price}>{Number(item.product.price).toFixed(2)} € / {item.product.unit}</Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity onPress={() => updateQty(item.product.id, item.quantity - 1)} style={styles.qtyBtn}><Text>−</Text></TouchableOpacity>
              <Text style={styles.qty}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => updateQty(item.product.id, item.quantity + 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
            </View>
            <Text style={styles.subtotal}>{(item.product.price * item.quantity).toFixed(2)} €</Text>
            <TouchableOpacity onPress={() => remove(item.product.id)}><Text style={{ color: '#DC2626', fontSize: 18 }}>✕</Text></TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Total</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#5BAE6A' }}>{total.toFixed(2)} €</Text>
        </View>
        <TouchableOpacity onPress={handleOrder} style={styles.orderBtn}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Commander →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2EEE2' },
  info:     { flex: 1 },
  name:     { fontWeight: '700', fontSize: 14, color: '#333' },
  price:    { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  qtyRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn:   { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E2EEE2', justifyContent: 'center', alignItems: 'center' },
  qty:      { fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  subtotal: { fontWeight: '700', fontSize: 14, minWidth: 56, textAlign: 'right' },
  footer:   { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2EEE2' },
  orderBtn: { backgroundColor: '#5BAE6A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
})
