import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { isCancellableByConsumer, ordersService, type Order } from '../../services/orders.service'
import { apiErrorMessage } from '../../services/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ordersService.list()
      .then(({ data }) => setOrders(data))
      .catch((err) => setError(apiErrorMessage(err, 'Impossible de charger vos commandes')))
      .finally(() => setLoading(false))
  }, [])

  /** ORDER-7 — annulation d'une commande non payée ; le stock est rendu au producteur. */
  const cancel = async (orderId: string) => {
    if (!window.confirm('Annuler cette commande ?')) return
    try {
      const { data } = await ordersService.updateStatus(orderId, 'CANCELLED')
      setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, status: data.status } : o)))
    } catch (err) {
      setError(apiErrorMessage(err, 'Annulation impossible'))
    }
  }

  return (
    <MainLayout>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>
        Mes commandes
      </h1>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

      {loading ? (
        <p>Chargement…</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <p style={{ color: 'var(--color-text-muted)' }}>Aucune commande pour le moment.</p>
          <Link to="/products" style={{ color: 'var(--color-primary)', fontWeight: 600, marginTop: 12, display: 'inline-block' }}>
            Faire mes premières courses →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div>
                  <strong style={{ fontFamily: 'var(--font-heading)' }}>
                    {order.producer_name ?? 'Producteur'}
                  </strong>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {format(new Date(order.created_at), 'dd MMMM yyyy', { locale: fr })}
                  </div>
                </div>
                <Badge orderStatus={order.status} />
              </div>

              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                {order.items?.map((item) => `${item.quantity}× ${item.product_name}`).join(', ')}
                {' · '}
                {order.delivery_mode === 'delivery' ? 'Livraison' : 'Retrait chez le producteur'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                  {Number(order.total_price).toFixed(2)} €
                </span>
                {isCancellableByConsumer(order.status) && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="ghost" size="sm" onClick={() => cancel(order.id)}>Annuler</Button>
                  <Link
                    to={`/checkout/${order.id}`}
                    style={{
                      background: 'var(--color-primary)',
                      color: '#fff',
                      padding: '0.375rem 0.875rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    Payer →
                  </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  )
}
