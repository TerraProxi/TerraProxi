import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { ordersService, type Order } from '../../services/orders.service'
import { Badge } from '../../components/ui/Badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ordersService.list().then(({ data }) => setOrders(data)).finally(() => setLoading(false))
  }, [])

  return (
    <MainLayout>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>
        Mes commandes
      </h1>

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
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                  {Number(order.total_price).toFixed(2)} €
                </span>
                {order.status === 'PENDING' && (
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
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  )
}
