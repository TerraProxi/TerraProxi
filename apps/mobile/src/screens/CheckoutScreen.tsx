import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import * as Linking from 'expo-linking'
import { StripeProvider, useStripe, PaymentSheetError } from '@stripe/stripe-react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api, { apiErrorMessage, apiErrorStatus } from '../services/api'
import { STRIPE_PUBLISHABLE_KEY } from '../config'
import { PrimaryButton } from '../components/PrimaryButton'
import { MessageState } from '../components/ScreenState'
import type { Order } from '../types/order'
import { Colors, Fonts } from '../theme'

type Props = StackScreenProps<RootStackParamList, 'Checkout'>

/** Retour dans l'application après une authentification 3-D Secure dans le navigateur. */
const STRIPE_RETURN_URL = Linking.createURL('stripe-redirect')
const URL_SCHEME = 'terraproxi'
/** Le passage en PAID est fait par le webhook Stripe : on interroge la commande quelques secondes. */
const PAID_POLL_INTERVAL_MS = 2_000
const PAID_POLL_ATTEMPTS = 10

type Phase =
  | { kind: 'preparing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }
  | { kind: 'paying' }
  | { kind: 'confirming' }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function paymentPreparationError(err: unknown): string {
  if (apiErrorStatus(err) === 503) return 'Le paiement en ligne est momentanément indisponible. Réessayez plus tard.'
  return apiErrorMessage(err, 'Impossible de préparer le paiement')
}

async function waitUntilPaid(orderId: string): Promise<boolean> {
  for (let attempt = 0; attempt < PAID_POLL_ATTEMPTS; attempt++) {
    try {
      const { data } = await api.get<Order>(`/orders/${orderId}`)
      if (data.status !== 'PENDING') return data.status !== 'CANCELLED'
    } catch {
      // Erreur réseau passagère : on retente jusqu'à épuisement des essais
    }
    await wait(PAID_POLL_INTERVAL_MS)
  }
  return false
}

function CheckoutInner({ route, navigation }: Props) {
  const { orderId, pendingOrderIds = [] } = route.params
  const { initPaymentSheet, presentPaymentSheet, handleURLCallback } = useStripe()
  const [order, setOrder] = useState<Order | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'preparing' })

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => { void handleURLCallback(url) })
    return () => subscription.remove()
  }, [handleURLCallback])

  const prepare = useCallback(async () => {
    setPhase({ kind: 'preparing' })
    try {
      const { data } = await api.get<Order>(`/orders/${orderId}`)
      setOrder(data)
      if (data.status !== 'PENDING') {
        setPhase({ kind: 'error', message: 'Cette commande n\'est plus en attente de paiement.' })
        return
      }
      const { data: intent } = await api.post<{ client_secret: string }>('/stripe/payment-intent', { order_id: orderId })
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: intent.client_secret,
        merchantDisplayName: 'TerraProxi',
        returnURL: STRIPE_RETURN_URL,
      })
      setPhase(error ? { kind: 'error', message: error.message } : { kind: 'ready' })
    } catch (err) {
      setPhase({ kind: 'error', message: paymentPreparationError(err) })
    }
  }, [orderId, initPaymentSheet])

  useEffect(() => { void prepare() }, [prepare])

  const goToNextStep = (isConfirmed: boolean) => {
    const confirmation = isConfirmed
      ? 'Votre paiement est confirmé.'
      : 'Paiement reçu : sa confirmation peut prendre quelques instants. Le statut de la commande sera mis à jour.'
    if (pendingOrderIds.length > 0) {
      Alert.alert('Paiement accepté', `${confirmation} Il reste ${pendingOrderIds.length} commande(s) à payer.`, [{
        text: 'Continuer',
        onPress: () => navigation.replace('Checkout', { orderId: pendingOrderIds[0], pendingOrderIds: pendingOrderIds.slice(1) }),
      }])
      return
    }
    Alert.alert('Paiement accepté', confirmation, [{ text: 'Voir mes commandes', onPress: () => navigation.replace('Orders') }])
  }

  const handlePay = async () => {
    setPhase({ kind: 'paying' })
    const { error } = await presentPaymentSheet()
    if (error) {
      setPhase({ kind: 'ready' })
      if (error.code !== PaymentSheetError.Canceled) Alert.alert('Paiement refusé', error.message)
      return
    }
    setPhase({ kind: 'confirming' })
    goToNextStep(await waitUntilPaid(orderId))
  }

  if (!order && phase.kind === 'preparing') {
    return <ActivityIndicator style={styles.loader} color={Colors.primaryDark} size="large" accessibilityLabel="Chargement" />
  }
  if (!order) {
    const message = phase.kind === 'error' ? phase.message : undefined
    return <MessageState icon="credit-card-off-outline" title="Paiement impossible" message={message} actionLabel="Réessayer" onAction={prepare} />
  }

  const total = Number(order.total_price).toFixed(2)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Paiement sécurisé</Text>
      {pendingOrderIds.length > 0 && (
        <Text style={styles.queueHint}>
          Encore {pendingOrderIds.length} commande{pendingOrderIds.length > 1 ? 's' : ''} à payer après celle-ci
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.producer}>{order.producer_name ?? 'Producteur'}</Text>
        {order.items?.map((item) => (
          <View key={item.id ?? item.product_name} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.quantity} × {item.product_name}</Text>
            <Text style={styles.itemPrice}>{(item.unit_price * item.quantity).toFixed(2)} €</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{total} €</Text>
        </View>
      </View>

      {phase.kind === 'error' && (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{phase.message}</Text>
          <PrimaryButton label="Réessayer" variant="outline" onPress={prepare} style={styles.retry} />
        </View>
      )}

      {phase.kind === 'confirming' ? (
        <View style={styles.confirming} accessibilityLiveRegion="polite">
          <ActivityIndicator color={Colors.primaryDark} />
          <Text style={styles.confirmingText}>Confirmation du paiement…</Text>
        </View>
      ) : (
        <PrimaryButton
          label={`Payer ${total} €`}
          onPress={handlePay}
          isLoading={phase.kind === 'preparing' || phase.kind === 'paying'}
          disabled={phase.kind !== 'ready'}
        />
      )}

      <Text style={styles.secure}>Paiement sécurisé via Stripe. Aucune donnée bancaire n'est stockée par TerraProxi.</Text>
    </ScrollView>
  )
}

export function CheckoutScreen(props: Props) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <MessageState
        icon="credit-card-off-outline"
        title="Paiement indisponible"
        message="Le paiement en ligne n'est pas configuré sur cette version de l'application. Votre commande reste enregistrée en attente de paiement dans « Mes commandes », où vous pouvez aussi l'annuler."
        actionLabel="Voir mes commandes"
        onAction={() => props.navigation.replace('Orders')}
      />
    )
  }
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} urlScheme={URL_SCHEME}>
      <CheckoutInner {...props} />
    </StripeProvider>
  )
}

const styles = StyleSheet.create({
  loader: { marginTop: 60 },
  container: { padding: 20, flexGrow: 1, backgroundColor: '#F6F9F6' },
  title: { fontSize: 22, fontFamily: Fonts.title, color: Colors.dark, marginBottom: 20, textAlign: 'center' },
  queueHint: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.gray700, textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  producer: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.dark, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.gray700, flex: 1 },
  itemPrice: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.dark },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  totalLabel: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.dark },
  totalAmount: { fontSize: 20, fontFamily: Fonts.title, color: Colors.primaryDark },
  errorBox: { backgroundColor: Colors.red50, borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.danger },
  retry: { marginTop: 12 },
  confirming: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  confirmingText: { fontSize: 15, fontFamily: Fonts.semibold, color: Colors.dark },
  secure: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray600, textAlign: 'center', marginTop: 12 },
})
