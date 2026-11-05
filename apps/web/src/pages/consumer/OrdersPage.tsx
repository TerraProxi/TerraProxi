import { Link, useLocation } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { OrderSummaryCard } from '../../components/orders/OrderSummaryCard'
import { Button } from '../../components/ui/Button'
import { isCancellableByConsumer, ordersService } from '../../services/orders.service'
import { apiErrorMessage } from '../../services/api'
import { usePaginatedOrders } from '../../hooks/usePaginatedOrders'

/** État posé par le panier après création de plusieurs commandes. */
export interface OrdersNavigationState {
  createdOrderCount?: number
}

export function OrdersPage() {
  const createdOrderCount = (useLocation().state as OrdersNavigationState | null)?.createdOrderCount
  const { orders, isLoading, isLoadingMore, hasMore, error, setError, reload, loadMore, replaceOrder } = usePaginatedOrders()

  /** ORDER-7 — annulation d'une commande non payée ; le stock est rendu au producteur. */
  const cancel = async (orderId: string) => {
    if (!window.confirm('Annuler cette commande ?')) return
    try {
      const { data } = await ordersService.updateStatus(orderId, 'CANCELLED')
      replaceOrder(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Annulation impossible'))
    }
  }

  return (
    <MainLayout title="Mes commandes">
      <h1 className="tp-page-title">Mes commandes</h1>

      {!!createdOrderCount && (
        <p className="tp-alert tp-alert--success" role="status">
          {createdOrderCount} commandes créées, une par producteur. Réglez chacune avec le bouton « Payer ».
        </p>
      )}
      {error && (
        <div className="tp-alert tp-alert--error" role="alert">
          {error} <Button variant="ghost" size="sm" onClick={reload}>Réessayer</Button>
        </div>
      )}

      {isLoading ? (
        <p>Chargement…</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <p className="tp-muted">Aucune commande pour le moment.</p>
          <Link to="/products" style={{ fontWeight: 600, marginTop: 12, display: 'inline-block' }}>
            Faire mes premières courses →
          </Link>
        </div>
      ) : (
        <div className="tp-stack">
          {orders.map((order) => (
            <OrderSummaryCard
              key={order.id}
              order={order}
              counterpartName={order.producer_name ?? 'Producteur'}
              detailPath={`/orders/${order.id}`}
            >
              {isCancellableByConsumer(order.status) && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => cancel(order.id)}>Annuler</Button>
                  <Link to={`/checkout/${order.id}`} className="tp-btn tp-btn--primary tp-btn--sm">Payer →</Link>
                </>
              )}
            </OrderSummaryCard>
          ))}
          {hasMore && (
            <Button variant="outline" onClick={loadMore} loading={isLoadingMore} style={{ alignSelf: 'center' }}>
              Voir plus de commandes
            </Button>
          )}
        </div>
      )}
    </MainLayout>
  )
}
