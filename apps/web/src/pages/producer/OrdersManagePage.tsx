import { useEffect, useState } from 'react'
import { MainLayout } from '../../components/layout/MainLayout'
import { ordersService, type Order, type OrderStatus } from '../../services/orders.service'
import { Badge } from '../../components/ui/Badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID:      'PREPARING',
  PREPARING: 'READY',
  READY:     'COMPLETED',
}

export function OrdersManagePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  const load = () =>
    ordersService.list({ status: filter === 'ALL' ? undefined : filter })
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [filter])

  const advance = async (order: Order) => {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    await ordersService.updateStatus(order.id, next)
    setOrders((os) => os.map((o) => o.id === order.id ? { ...o, status: next } : o))
  }

  const STATUSES = ['ALL', 'PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']

  return (
    <MainLayout>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-6)' }}>
        Gestion des commandes
      </h1>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid',
              borderColor: filter === s ? 'var(--color-secondary)' : 'var(--color-border)',
              background: filter === s ? 'var(--color-secondary)' : 'transparent',
              color: filter === s ? '#fff' : 'var(--color-dark)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontWeight: filter === s ? 700 : 400,
              fontSize: 'var(--text-sm)',
            }}
          >
            {s === 'ALL' ? 'Toutes' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Aucune commande pour ce filtre.</p>
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
                    {order.consumer_name ?? 'Client'}
                  </strong>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    {format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Badge orderStatus={order.status} />
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                    {Number(order.total_price).toFixed(2)} €
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                {order.items?.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
              </div>

              {NEXT_STATUS[order.status] && (
                <button
                  onClick={() => advance(order)}
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.375rem 1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  Passer en « {NEXT_STATUS[order.status]} » →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  )
}
