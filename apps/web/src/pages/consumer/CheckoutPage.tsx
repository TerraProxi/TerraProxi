import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { MainLayout } from '../../components/layout/MainLayout'
import { ordersService, type Order } from '../../services/orders.service'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '')

function CheckoutForm({ order }: { order: Order }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError('')

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders`,
      },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Erreur de paiement')
      setProcessing(false)
    }
    // Stripe redirige vers return_url si succès
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-4)' }}>
          Récapitulatif — {order.producer_name}
        </h3>
        {order.items?.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 'var(--text-sm)' }}>
            <span>{item.quantity}× {item.product_name}</span>
            <span>{(Number(item.unit_price) * item.quantity).toFixed(2)} €</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>Total</span>
          <span>{Number(order.total_price).toFixed(2)} €</span>
        </div>
      </div>

      <div
        style={{
          background: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <PaymentElement />
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: 'var(--color-danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        style={{
          width: '100%',
          background: 'var(--color-secondary)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem',
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: 'var(--text-base)',
          cursor: processing ? 'not-allowed' : 'pointer',
          opacity: processing ? 0.7 : 1,
        }}
      >
        {processing ? 'Traitement…' : `Payer ${Number(order.total_price).toFixed(2)} €`}
      </button>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 12 }}>
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
        if (o.status === 'PENDING') {
          const { data } = await ordersService.createPaymentIntent(orderId)
          setClientSecret(data.client_secret)
        }
      } catch {
        setError('Impossible de charger la commande')
      } finally {
        setLoading(false)
      }
    })()
  }, [orderId])

  return (
    <MainLayout>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-8) 0' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>
          Paiement
        </h1>

        {loading && <p>Chargement…</p>}
        {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
        {order && order.status !== 'PENDING' && (
          <p>Cette commande a déjà été traitée (statut : {order.status}).</p>
        )}

        {order && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm order={order} />
          </Elements>
        )}
      </div>
    </MainLayout>
  )
}
