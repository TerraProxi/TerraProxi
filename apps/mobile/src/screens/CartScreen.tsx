import { useState } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Alert, TextInput,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Spacing, Radius } from '../theme'
import {
  useCartStore,
  type CartProducerGroup,
  type DeliveryAddress,
  type DeliveryMode,
  DELIVERY_FEE_EUR,
  TVA_RATE,
  getGroupSubtotal,
  getGroupDeliveryFee,
  getCartGrandTotal,
} from '../store/cart.store'
import { useAuthStore } from '../store/auth.store'
import api from '../services/api'

type Nav = StackNavigationProp<RootStackParamList>

const normalizePostalCode = (value: string) => value.replace(/\D/g, '').slice(0, 5)

const getAddressValidationError = (address: DeliveryAddress): string | null => {
  if (address.street.trim().length < 6) {
    return 'Veuillez renseigner un numéro et une rue valides.'
  }
  if (!/^\d{5}$/.test(address.postalCode.trim())) {
    return 'Le code postal doit contenir exactement 5 chiffres.'
  }
  if (address.city.trim().length < 2) {
    return 'Veuillez renseigner une ville valide.'
  }
  return null
}

const formatAddressForApi = (address: DeliveryAddress) => {
  const extra = address.extra.trim()
  const line1 = extra ? `${address.street.trim()}, ${extra}` : address.street.trim()
  return `${line1}, ${address.postalCode.trim()} ${address.city.trim()}`
}

function getProductImage(group: CartProducerGroup, productId: string) {
  const found = group.items.find((item) => item.product.id === productId)
  if (found?.product.image_url) return found.product.image_url
  return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=200'
}

interface ProducerSectionProps {
  group: CartProducerGroup
  onRemoveProducer: () => void
  onRemoveItem: (productId: string) => void
  onUpdateQty: (productId: string, quantity: number) => void
  onSetDeliveryMode: (mode: DeliveryMode) => void
  onSetDeliveryAddress: (address: DeliveryAddress) => void
}

function ProducerCartSection({
  group,
  onRemoveProducer,
  onRemoveItem,
  onUpdateQty,
  onSetDeliveryMode,
  onSetDeliveryAddress,
}: ProducerSectionProps) {
  const [addressDraft, setAddressDraft] = useState<DeliveryAddress>(group.deliveryAddress)
  const [isEditingAddress, setIsEditingAddress] = useState(false)

  const subtotal = getGroupSubtotal(group)
  const deliveryFee = getGroupDeliveryFee(group)
  const tva = (subtotal + deliveryFee) * TVA_RATE
  const sectionTotal = subtotal + deliveryFee + tva

  const handleSaveAddress = () => {
    const validationError = getAddressValidationError(addressDraft)
    if (validationError) {
      Alert.alert('Adresse invalide', validationError)
      return
    }
    onSetDeliveryAddress({
      street: addressDraft.street.trim(),
      postalCode: addressDraft.postalCode.trim(),
      city: addressDraft.city.trim(),
      extra: addressDraft.extra.trim(),
    })
    setIsEditingAddress(false)
  }

  return (
    <View style={styles.producerSection}>
      <View style={styles.producerHeader}>
        <View style={styles.producerHeaderLeft}>
          <MaterialCommunityIcons name="storefront" size={20} color={Colors.primary} />
          <View style={styles.producerHeaderText}>
            <Text style={styles.producerName}>{group.producerName}</Text>
            <Text style={styles.producerMeta}>
              {group.items.length} article{group.items.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRemoveProducer} style={styles.removeProducerBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.gray500} />
        </TouchableOpacity>
      </View>

      {group.items.map((item) => (
        <View key={item.product.id} style={styles.itemCard}>
          <Image
            source={{ uri: getProductImage(group, item.product.id) }}
            style={styles.itemImage}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.product.name}</Text>
            <Text style={styles.itemMeta}>
              {item.product.unit} · {item.product.price.toFixed(2)} €
            </Text>
          </View>
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              onPress={() => {
                if (item.quantity <= 1) onRemoveItem(item.product.id)
                else onUpdateQty(item.product.id, item.quantity - 1)
              }}
              style={styles.qtyBtn}
            >
              <MaterialCommunityIcons name="minus" size={16} color={Colors.gray700} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              onPress={() => onUpdateQty(item.product.id, item.quantity + 1)}
              style={styles.qtyBtn}
            >
              <MaterialCommunityIcons name="plus" size={16} color={Colors.gray700} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={styles.deliverySectionTitle}>Livraison / retrait</Text>
      <View style={styles.deliveryRow}>
        <TouchableOpacity
          style={[
            styles.deliveryCard,
            group.deliveryMode === 'delivery' && styles.deliveryCardSelected,
          ]}
          onPress={() => onSetDeliveryMode('delivery')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="truck-delivery"
            size={22}
            color={group.deliveryMode === 'delivery' ? Colors.primary : Colors.gray600}
          />
          <Text style={[
            styles.deliveryLabel,
            group.deliveryMode === 'delivery' && styles.deliveryLabelSelected,
          ]}
          >
            Livraison
          </Text>
          <Text style={styles.deliveryPrice}>+{DELIVERY_FEE_EUR.toFixed(2)} €</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.deliveryCard,
            group.deliveryMode === 'pickup' && styles.deliveryCardSelected,
          ]}
          onPress={() => onSetDeliveryMode('pickup')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="storefront"
            size={22}
            color={group.deliveryMode === 'pickup' ? Colors.primary : Colors.gray600}
          />
          <Text style={[
            styles.deliveryLabel,
            group.deliveryMode === 'pickup' && styles.deliveryLabelSelected,
          ]}
          >
            Retrait
          </Text>
          <Text style={styles.deliveryPrice}>Gratuit</Text>
        </TouchableOpacity>
      </View>

      {group.deliveryMode === 'delivery' && (
        <View style={styles.addressCard}>
          <View style={styles.addressLeft}>
            <MaterialCommunityIcons name="map-marker" size={22} color={Colors.primary} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressTitle}>Adresse de livraison</Text>
              {isEditingAddress ? (
                <View style={styles.addressForm}>
                  <TextInput
                    style={styles.addressField}
                    value={addressDraft.street}
                    onChangeText={(street) => setAddressDraft((prev) => ({ ...prev, street }))}
                    placeholder="Numéro et rue"
                    placeholderTextColor={Colors.gray400}
                  />
                  <View style={styles.addressInlineRow}>
                    <TextInput
                      style={[styles.addressField, styles.addressPostalField]}
                      value={addressDraft.postalCode}
                      onChangeText={(postalCode) => setAddressDraft((prev) => ({
                        ...prev,
                        postalCode: normalizePostalCode(postalCode),
                      }))}
                      placeholder="Code postal"
                      keyboardType="number-pad"
                      placeholderTextColor={Colors.gray400}
                    />
                    <TextInput
                      style={[styles.addressField, styles.addressCityField]}
                      value={addressDraft.city}
                      onChangeText={(city) => setAddressDraft((prev) => ({ ...prev, city }))}
                      placeholder="Ville"
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>
                  <TextInput
                    style={styles.addressField}
                    value={addressDraft.extra}
                    onChangeText={(extra) => setAddressDraft((prev) => ({ ...prev, extra }))}
                    placeholder="Complément (bâtiment, étage…)"
                    placeholderTextColor={Colors.gray400}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.addressText}>{group.deliveryAddress.street}</Text>
                  <Text style={styles.addressText}>
                    {group.deliveryAddress.postalCode} {group.deliveryAddress.city}
                  </Text>
                  {group.deliveryAddress.extra ? (
                    <Text style={styles.addressText}>{group.deliveryAddress.extra}</Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
          {isEditingAddress ? (
            <View style={styles.addressActions}>
              <TouchableOpacity onPress={() => {
                setAddressDraft({ ...group.deliveryAddress })
                setIsEditingAddress(false)
              }}
              >
                <Text style={styles.cancelLink}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveAddress}>
                <Text style={styles.modifyLink}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => {
              setAddressDraft({ ...group.deliveryAddress })
              setIsEditingAddress(true)
            }}
            >
              <Text style={styles.modifyLink}>Modifier</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.sectionSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sous-total producteur</Text>
          <Text style={styles.summaryValue}>{subtotal.toFixed(2)} €</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Livraison</Text>
          <Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} €</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>TVA (5,5 %)</Text>
          <Text style={styles.summaryValue}>{tva.toFixed(2)} €</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.sectionTotalLabel}>Total producteur</Text>
          <Text style={styles.sectionTotalValue}>{sectionTotal.toFixed(2)} €</Text>
        </View>
      </View>
    </View>
  )
}

export function CartScreen() {
  const {
    groups,
    remove,
    removeProducer,
    updateQty,
    setDeliveryMode,
    setDeliveryAddress,
    clear,
  } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const nav = useNavigation<Nav>()

  const grandTotal = getCartGrandTotal(groups)
  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0)

  const handlePay = async () => {
    if (!isAuthenticated) {
      nav.navigate('Login')
      return
    }
    if (groups.length === 0) return

    for (const group of groups) {
      if (group.deliveryMode === 'delivery') {
        const validationError = getAddressValidationError(group.deliveryAddress)
        if (validationError) {
          Alert.alert(
            'Adresse invalide',
            `${group.producerName} : ${validationError}`,
          )
          return
        }
      }
    }

    try {
      const orderIds: string[] = []

      for (const group of groups) {
        const payload: Record<string, unknown> = {
          producer_id: group.producerId,
          items: group.items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          delivery_mode: group.deliveryMode,
        }

        if (group.deliveryMode === 'delivery') {
          payload.delivery_address = formatAddressForApi(group.deliveryAddress)
        }

        const { data: order } = await api.post<{ id: string }>('/orders', payload)
        orderIds.push(order.id)
      }

      clear()

      if (orderIds.length === 1) {
        nav.navigate('Checkout', { orderId: orderIds[0] })
        return
      }

      nav.navigate('Checkout', {
        orderId: orderIds[0],
        pendingOrderIds: orderIds.slice(1),
      })
    } catch {
      Alert.alert('Erreur', 'Impossible de créer les commandes')
    }
  }

  const confirmRemoveProducer = (group: CartProducerGroup) => {
    Alert.alert(
      'Retirer ce producteur',
      `Supprimer tous les articles de ${group.producerName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeProducer(group.producerId),
        },
      ],
    )
  }

  if (groups.length === 0) {
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>
          {groups.length} producteur{groups.length > 1 ? 's' : ''} · {totalItems} article{totalItems > 1 ? 's' : ''}
        </Text>

        {groups.map((group) => (
          <ProducerCartSection
            key={group.producerId}
            group={group}
            onRemoveProducer={() => confirmRemoveProducer(group)}
            onRemoveItem={remove}
            onUpdateQty={updateQty}
            onSetDeliveryMode={(mode) => setDeliveryMode(group.producerId, mode)}
            onSetDeliveryAddress={(address) => setDeliveryAddress(group.producerId, address)}
          />
        ))}

        <View style={styles.summaryCard}>
          <Text style={styles.globalSummaryTitle}>Récapitulatif global</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Commandes</Text>
            <Text style={styles.summaryValue}>{groups.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total à payer</Text>
            <Text style={styles.summaryTotalValue}>{grandTotal.toFixed(2)} €</Text>
          </View>
          {groups.length > 1 ? (
            <Text style={styles.multiOrderHint}>
              Vous paierez {groups.length} commandes séparées (une par producteur).
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.8}>
          <MaterialCommunityIcons name="lock" size={18} color={Colors.white} />
          <Text style={styles.payBtnText}>
            Payer {grandTotal.toFixed(2)} €
            {groups.length > 1 ? ` (${groups.length} commandes)` : ''}
          </Text>
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
    paddingHorizontal: Spacing.lg,
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
    gap: Spacing.lg,
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  introText: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '600',
  },
  producerSection: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  producerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  producerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  producerHeaderText: {
    flex: 1,
    gap: 2,
  },
  producerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  producerMeta: {
    fontSize: 12,
    color: Colors.gray500,
  },
  removeProducerBtn: {
    padding: Spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray100,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  itemMeta: {
    fontSize: 12,
    color: Colors.gray500,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    minWidth: 20,
    textAlign: 'center',
  },
  deliverySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
    marginTop: Spacing.xs,
  },
  deliveryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  deliveryCard: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  deliveryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.green50,
  },
  deliveryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
  },
  deliveryLabelSelected: {
    color: Colors.primary,
  },
  deliveryPrice: {
    fontSize: 11,
    color: Colors.gray500,
    fontWeight: '500',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressForm: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  addressInlineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addressActions: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark,
  },
  addressText: {
    fontSize: 12,
    color: Colors.gray500,
  },
  addressField: {
    minHeight: 38,
    fontSize: 12,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  addressPostalField: {
    flex: 0.9,
  },
  addressCityField: {
    flex: 1.6,
  },
  modifyLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  cancelLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray500,
  },
  sectionSummary: {
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  globalSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: Spacing.xs,
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
    marginVertical: Spacing.xs,
  },
  sectionTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  sectionTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
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
  multiOrderHint: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 28,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
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
