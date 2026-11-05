import { useState } from 'react'
import { MainLayout } from '../../components/layout/MainLayout'
import { OrderSummaryCard } from '../../components/orders/OrderSummaryCard'
import { ProducerOrderActions } from '../../components/orders/ProducerOrderActions'
import { Button } from '../../components/ui/Button'
import { ORDER_STATUS_LABELS, type OrderStatus } from '../../services/orders.service'
import { usePaginatedOrders } from '../../hooks/usePaginatedOrders'

const STATUS_FILTERS: readonly OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']

export function OrdersManagePage() {
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined)
  const { orders, isLoading, isLoadingMore, hasMore, error, setError, reload, loadMore, replaceOrder } = usePaginatedOrders(filter)

  return (
    <MainLayout title="Commandes reçues">
      <h1 className="tp-page-title">Gestion des commandes</h1>

      <div className="tp-cluster" role="group" aria-label="Filtrer par statut" style={{ marginBottom: 'var(--space-6)' }}>
        <button type="button" className="tp-chip" aria-pressed={filter === undefined} onClick={() => setFilter(undefined)}>
          Toutes
        </button>
        {STATUS_FILTERS.map((status) => (
          <button key={status} type="button" className="tp-chip" aria-pressed={filter === status} onClick={() => setFilter(status)}>
            {ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {error && (
        <div className="tp-alert tp-alert--error" role="alert">
          {error} <Button variant="ghost" size="sm" onClick={reload}>Recharger</Button>
        </div>
      )}

      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <p>Chargement…</p>
        ) : orders.length === 0 ? (
          <p className="tp-muted">Aucune commande pour ce filtre.</p>
        ) : (
          <div className="tp-stack">
            {orders.map((order) => (
              <OrderSummaryCard
                key={order.id}
                order={order}
                counterpartName={order.consumer_name ?? 'Client'}
                detailPath={`/producer/orders/${order.id}`}
              >
                <ProducerOrderActions order={order} onUpdated={replaceOrder} onError={setError} />
              </OrderSummaryCard>
            ))}
            {hasMore && (
              <Button variant="outline" onClick={loadMore} loading={isLoadingMore} style={{ alignSelf: 'center' }}>
                Voir plus de commandes
              </Button>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
