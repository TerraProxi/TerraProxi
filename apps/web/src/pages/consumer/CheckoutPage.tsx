import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { OrderItemsTable } from '../../components/orders/OrderItemsTable'
import { ORDER_STATUS_LABELS, ordersService, type Order } from '../../services/orders.service'
import { apiErrorMessage } from '../../services/api'
import { formatPrice } from '../../utils/format'

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? ''
const isStripeConfigured = STRIPE_KEY !== '' && !STRIPE_KEY.includes('CHANGE_ME')

/** Chargé à la première ouverture de la page de paiement, jamais sans clé publique. */
let stripePromise: Promise<Stripe | null> | null = null
const getStripe = () => (stripePromise ??= loadStripe(STRIPE_KEY))

function CheckoutForm({ order }: { order: Order }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError('')

    // En cas de succès, Stripe redirige vers le détail de la commande (?redirect_status=…)
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/orders/${order.id}` },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Erreur de paiement')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="tp-card" style={{ marginBottom: 'var(--space-5)' }}>
        <PaymentElement />
      </div>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

      <Button type="submit" variant="secondary" size="lg" className="tp-btn--block" disabled={!stripe} loading={processing}>
        Payer {formatPrice(order.total_price)}
      </Button>

      <p className="tp-muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center', marginTop: 12 }}>
        🔒 Paiement sécurisé via Stripe. Aucune donnée bancaire n'est stockée sur nos serveurs.
      </p>
    </form>
  )
}

export function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) return
    ;(async () => {
      try {
        const { data: o } = await ordersService.getById(orderId)
        setOrder(o)
        if (o.status === 'PENDING' && isStripeConfigured) {
          const { data } = await ordersService.createPaymentIntent(orderId)
          setClientSecret(data.client_secret)
        }
      } catch (err) {
        setError(apiErrorMessage(err, 'Impossible de préparer le paiement'))
      } finally {
        setLoading(false)
      }
    })()
  }, [orderId])

  return (
    <MainLayout title="Paiement">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 className="tp-page-title">Paiement</h1>

        {loading && <p>Chargement…</p>}
        {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

        {order && (
          <section className="tp-card" aria-labelledby="titre-recap" style={{ marginBottom: 'var(--space-5)' }}>
            <h2 id="titre-recap" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
              Récapitulatif — {order.producer_name ?? 'Producteur'}
            </h2>
            <OrderItemsTable items={order.items ?? []} total={order.total_price} />
          </section>
        )}

        {order && order.status !== 'PENDING' && (
          <p className="tp-alert tp-alert--info">
            Cette commande n'est plus à payer (statut : {ORDER_STATUS_LABELS[order.status]}).{' '}
            <Link to={`/orders/${order.id}`}>Voir la commande</Link>
          </p>
        )}

        {order?.status === 'PENDING' && !isStripeConfigured && (
          <div className="tp-alert tp-alert--info" role="status">
            Le paiement en ligne n'est pas encore disponible sur ce site. Votre commande est enregistrée :
            vous pourrez la régler depuis <Link to={`/orders/${order.id}`}>son détail</Link> dès son ouverture,
            ou l'annuler si besoin.
          </div>
        )}

        {order && clientSecret && (
          <Elements stripe={getStripe()} options={{ clientSecret, locale: 'fr' }}>
            <CheckoutForm order={order} />
          </Elements>
        )}
      </div>
    </MainLayout>
  )
}
