import { useState } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors } from '../theme'
import { useCartStore } from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'
import { useMockStore } from '../store/mock.store'
import api from '../services/api'

type Nav = StackNavigationProp<RootStackParamList>

type DeliveryMode = 'delivery' | 'pickup'

export function CartScreen() {
  const { items, total, producerId, remove, updateQty, clear } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { products } = useMockStore()
  const nav = useNavigation<Nav>()
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('delivery')

  const deliveryFee = deliveryMode === 'delivery' ? 5.0 : 0
  const tva = (total + deliveryFee) * 0.055
  const grandTotal = total + deliveryFee + tva

  const getProductImage = (productId: string) => {
    const found = products.find((p) => p.id === productId)
    if (found) return found.image
    return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=200'
  }

  const handlePay = async () => {
    if (!isAuthenticated) {
      nav.navigate('Login')
      return
    }
    if (!producerId || !items.length) return

    try {
      const { data: order } = await api.post('/orders', {
        producer_id: producerId,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        delivery_mode: deliveryMode,
      })
      clear()
      nav.navigate('Checkout', { orderId: order.id })
    } catch {
      Alert.alert('Erreur', 'Impossible de créer la commande')
    }
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Votre Panier</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="basket" size={80} color={Colors.gray300} />
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <TouchableOpacity onPress={() => nav.navigate('Tabs')}>
            <Text style={styles.emptyLink}>Commencer vos achats</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Votre Panier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Articles</Text>

        {items.map((item) => (
          <View key={item.product.id} style={styles.itemCard}>
            <Image source={{ uri: getProductImage(item.product.id) }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemMeta}>
                {item.product.unit} · {item.product.price.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.qtyContainer}>
              <TouchableOpacity
                onPress={() => {
                  if (item.quantity <= 1) remove(item.product.id)
                  else updateQty(item.product.id, item.quantity - 1)
                }}
                style={styles.qtyBtn}
              >
                <MaterialCommunityIcons name="minus" size={16} color={Colors.gray700} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => updateQty(item.product.id, item.quantity + 1)}
                style={styles.qtyBtn}
              >
                <MaterialCommunityIcons name="plus" size={16} color={Colors.gray700} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Mode de livraison</Text>

        <View style={styles.deliveryRow}>
          <TouchableOpacity
            style={[
              styles.deliveryCard,
              deliveryMode === 'delivery' && styles.deliveryCardSelected,
            ]}
            onPress={() => setDeliveryMode('delivery')}
            activeOpacity={0.7}
          >
            <View style={styles.deliveryIconCircle}>
              <MaterialCommunityIcons name="truck-delivery" size={22} color={deliveryMode === 'delivery' ? Colors.primary : Colors.gray600} />
            </View>
            <Text style={[styles.deliveryLabel, deliveryMode === 'delivery' && styles.deliveryLabelSelected]}>Livraison</Text>
            <Text style={styles.deliveryPrice}>+5.00 €</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryCard,
              deliveryMode === 'pickup' && styles.deliveryCardSelected,
            ]}
            onPress={() => setDeliveryMode('pickup')}
            activeOpacity={0.7}
          >
            <View style={styles.deliveryIconCircle}>
              <MaterialCommunityIcons name="storefront" size={22} color={deliveryMode === 'pickup' ? Colors.primary : Colors.gray600} />
            </View>
            <Text style={[styles.deliveryLabel, deliveryMode === 'pickup' && styles.deliveryLabelSelected]}>Retrait</Text>
            <Text style={styles.deliveryPrice}>Gratuit</Text>
          </TouchableOpacity>
        </View>

        {deliveryMode === 'delivery' && (
          <View style={styles.addressCard}>
            <View style={styles.addressLeft}>
              <MaterialCommunityIcons name="map-marker" size={22} color={Colors.primary} />
              <View style={styles.addressInfo}>
                <Text style={styles.addressTitle}>Domicile</Text>
                <Text style={styles.addressText}>12 Rue de la République, 34000 Montpellier</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.modifyLink}>Modifier</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>{total.toFixed(2)} €</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Livraison</Text>
            <Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} €</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>TVA (5.5%)</Text>
            <Text style={styles.summaryValue}>{tva.toFixed(2)} €</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{grandTotal.toFixed(2)} €</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.8}>
          <MaterialCommunityIcons name="lock" size={18} color={Colors.white} />
          <Text style={styles.payBtnText}>Payer avec Stripe</Text>
        </TouchableOpacity>
        <Text style={styles.sslText}>
          <MaterialCommunityIcons name="shield-lock" size={14} color={Colors.gray400} />
          {'  '}Paiement sécurisé SSL 256-bit
        </Text>
      </View>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray600,
  },
  emptyLink: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginTop: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  itemMeta: {
    fontSize: 13,
    color: Colors.gray500,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    minWidth: 24,
    textAlign: 'center',
  },
  deliveryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deliveryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  deliveryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.green50,
  },
  deliveryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray700,
  },
  deliveryLabelSelected: {
    color: Colors.primary,
  },
  deliveryPrice: {
    fontSize: 12,
    color: Colors.gray500,
    fontWeight: '500',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  addressText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  modifyLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.gray600,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    alignItems: 'center',
    gap: 10,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
  },
  payBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  sslText: {
    fontSize: 12,
    color: Colors.gray400,
  },
})
