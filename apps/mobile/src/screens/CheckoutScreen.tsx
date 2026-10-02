import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { StripeProvider, useStripe } from '@stripe/stripe-react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'

type Props = StackScreenProps<RootStackParamList, 'Checkout'>

interface Order {
  id: string
  total_price: number
  producer_name?: string
  items?: { product_name: string; quantity: number; unit_price: number }[]
}

function CheckoutInner({
  orderId,
  pendingOrderIds = [],
  navigation,
}: {
  orderId: string
  pendingOrderIds?: string[]
  navigation: Props['navigation']
}) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [order, setOrder] = useState<Order | null>(null)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: o } = await api.get<Order>(`/orders/${orderId}`)
        setOrder(o)

        const { data } = await api.post('/stripe/payment-intent', { order_id: orderId })
        if (data.is_mock) {
          setIsDemoMode(true)
          setReady(true)
          return
        }

        const { error } = await initPaymentSheet({
          paymentIntentClientSecret: data.client_secret,
          merchantDisplayName: 'TerraProxi',
        })
        if (!error) {
          setReady(true)
        } else {
          setIsDemoMode(true)
          setReady(true)
        }
      } catch {
        setIsDemoMode(true)
        setReady(true)
      }
    })()
  }, [orderId])

  const handlePay = async () => {
    setProcessing(true)
    try {
      if (isDemoMode) {
        await api.post('/stripe/mock-confirm', { order_id: orderId })
      } else {
        const { error } = await presentPaymentSheet()
        if (error) {
          Alert.alert('Paiement refusé', error.message)
          setProcessing(false)
          return
        }
      }

      if (pendingOrderIds.length > 0) {
        Alert.alert(
          'Paiement accepté',
          `Commande confirmée. Il reste ${pendingOrderIds.length} commande(s) à payer.`,
          [{
            text: 'Continuer',
            onPress: () => navigation.replace('Checkout', {
              orderId: pendingOrderIds[0],
              pendingOrderIds: pendingOrderIds.slice(1),
            }),
          }],
        )
        return
      }

      Alert.alert('✓ Paiement accepté', 'Votre commande est confirmée !', [
        { text: 'Voir mes commandes', onPress: () => navigation.replace('Orders') },
      ])
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.error || 'Échec du paiement')
    } finally {
      setProcessing(false)
    }
  }

  if (!order) return <ActivityIndicator style={{ marginTop: 60 }} color="#5BAE6A" size="large" />

  const remainingCount = pendingOrderIds.length

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Paiement sécurisé</Text>
      {remainingCount > 0 ? (
        <Text style={styles.queueHint}>
          Commande {1} · {remainingCount + 1} restante{remainingCount + 1 > 1 ? 's' : ''}
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.producer}>{order.producer_name}</Text>
        {order.items?.map((i, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemName}>{i.quantity}× {i.product_name}</Text>
            <Text style={styles.itemPrice}>{(i.unit_price * i.quantity).toFixed(2)} €</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{Number(order.total_price).toFixed(2)} €</Text>
        </View>
      </View>

      <TouchableOpacity onPress={handlePay} disabled={!ready || processing} style={[styles.payBtn, (!ready || processing) && { opacity: 0.6 }]}>
        <Text style={styles.payBtnText}>
          {processing ? 'Traitement…' : `Payer ${Number(order?.total_price ?? 0).toFixed(2)} €`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.secure}>🔒 Paiement sécurisé via Stripe. Aucune donnée bancaire stockée.</Text>
    </ScrollView>
  )
}

export function CheckoutScreen({ route, navigation }: Props) {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_KEY ?? ''}>
      <CheckoutInner
        orderId={route.params.orderId}
        pendingOrderIds={route.params.pendingOrderIds}
        navigation={navigation}
      />
    </StripeProvider>
  )
}

const styles = StyleSheet.create({
  container:   { padding: 20, flexGrow: 1, backgroundColor: '#F6F9F6' },
  title:       { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 20, textAlign: 'center' },
  queueHint:   { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E2EEE2', marginBottom: 20 },
  producer:    { fontWeight: '700', fontSize: 16, color: '#333', marginBottom: 12 },
  itemRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName:    { fontSize: 14, color: '#555', flex: 1 },
  itemPrice:   { fontSize: 14, fontWeight: '600', color: '#333' },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2EEE2' },
  totalLabel:  { fontSize: 16, fontWeight: '700' },
  totalAmount: { fontSize: 20, fontWeight: '700', color: '#5BAE6A' },
  payBtn:      { backgroundColor: '#5BAE6A', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  payBtnText:  { color: '#fff', fontWeight: '700', fontSize: 17 },
  secure:      { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
})
