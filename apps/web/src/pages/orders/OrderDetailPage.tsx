import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { OrderProgress } from '../../components/orders/OrderProgress'
import { OrderItemsTable } from '../../components/orders/OrderItemsTable'
import { PaymentReturnBanner } from '../../components/orders/PaymentReturnBanner'
import { ProducerOrderActions } from '../../components/orders/ProducerOrderActions'
import { useAuth } from '../../contexts/AuthContext'
import { usePaymentConfirmation } from '../../hooks/usePaymentConfirmation'
import { DELIVERY_MODE_LABELS, isCancellableByConsumer, ordersService, type Order } from '../../services/orders.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { formatDateTime } from '../../utils/format'

/** ORDER-5 — détail d'une commande, côté client (/orders/:id) comme producteur (/producer/orders/:id). */
export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { user } = useAuth()
  const isProducer = user?.role === 'PRODUCER'
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const refreshOrder = useCallback((updated: Order) => {
    setOrder((current) => ({ ...current, ...updated, items: updated.items ?? current?.items }))
  }, [])
  const paymentReturn = usePaymentConfirmation(order, refreshOrder)

  const load = useCallback(async () => {
    if (!orderId) return
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await ordersService.getById(orderId)
      setOrder(data)
    } catch (err) {
      const status = apiErrorStatus(err)
      if (status === 404 || status === 403 || status === 400) setIsNotFound(true)
      else setError(apiErrorMessage(err, 'Impossible de charger la commande'))
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  useEffect(() => { load() }, [load])

  const cancel = async () => {
    if (!order || !window.confirm('Annuler cette commande ?')) return
    setIsCancelling(true)
    try {
      const { data } = await ordersService.updateStatus(order.id, 'CANCELLED')
      refreshOrder(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Annulation impossible'))
    } finally {
      setIsCancelling(false)
    }
  }

  const backLink = isProducer
    ? <Link to="/producer/orders">← Toutes les commandes reçues</Link>
    : <Link to="/orders">← Mes commandes</Link>

  if (isLoading && !order) return <MainLayout title="Commande"><p>Chargement…</p></MainLayout>
  if (!order) {
    const heading = isNotFound ? 'Commande introuvable' : 'Commande'
    return (
      <MainLayout title={heading}>
        <h1 className="tp-page-title">{heading}</h1>
        {error && (
          <div className="tp-alert tp-alert--error" role="alert">
            {error} <Button variant="ghost" size="sm" onClick={load}>Réessayer</Button>
          </div>
        )}
        {backLink}
      </MainLayout>
    )
  }

  const counterpart = isProducer ? order.consumer_name ?? 'Client' : order.producer_name ?? 'Producteur'

  return (
    <MainLayout title={`Commande du ${formatDateTime(order.created_at)}`}>
      <p className="tp-small" style={{ marginBottom: 'var(--space-4)' }}>{backLink}</p>

      <div className="tp-page-header">
        <h1 className="tp-page-title">Commande — {counterpart}</h1>
        <Badge orderStatus={order.status} />
      </div>

      <PaymentReturnBanner paymentReturn={paymentReturn} orderId={order.id} />
      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

      <div className="tp-split">
        <div className="tp-stack">
          <section className="tp-card" aria-labelledby="titre-articles">
            <h2 id="titre-articles" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Articles</h2>
            <OrderItemsTable items={order.items ?? []} total={order.total_price} />
          </section>

          <section className="tp-card" aria-labelledby="titre-avancement">
            <h2 id="titre-avancement" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Avancement</h2>
            <OrderProgress status={order.status} />
          </section>
        </div>

        <aside className="tp-card" aria-label="Informations de la commande">
          <dl className="tp-stack" style={{ gap: 'var(--space-3)' }}>
            <div><dt className="tp-label">Passée le</dt><dd>{formatDateTime(order.created_at)}</dd></div>
            {order.updated_at && <div><dt className="tp-label">Dernière mise à jour</dt><dd>{formatDateTime(order.updated_at)}</dd></div>}
            <div><dt className="tp-label">Réception</dt><dd>{DELIVERY_MODE_LABELS[order.delivery_mode]}</dd></div>
            {order.delivery_mode === 'delivery' && order.delivery_address && (
              <div><dt className="tp-label">Adresse de livraison</dt><dd style={{ whiteSpace: 'pre-line' }}>{order.delivery_address}</dd></div>
            )}
            {order.notes && <div><dt className="tp-label">Note du client</dt><dd style={{ whiteSpace: 'pre-line' }}>{order.notes}</dd></div>}
          </dl>

          <div className="tp-cluster" style={{ marginTop: 'var(--space-5)' }}>
            {isProducer ? (
              <ProducerOrderActions order={order} onUpdated={refreshOrder} onError={setError} />
            ) : isCancellableByConsumer(order.status) && (
              <>
                <Link to={`/checkout/${order.id}`} className="tp-btn tp-btn--primary tp-btn--md">Payer →</Link>
                <Button variant="danger-ghost" onClick={cancel} loading={isCancelling}>Annuler la commande</Button>
              </>
            )}
          </div>
        </aside>
      </div>
    </MainLayout>
  )
}
