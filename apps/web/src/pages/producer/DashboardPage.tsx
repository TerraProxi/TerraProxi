import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { ordersService, type Order } from '../../services/orders.service'
import { productsService, type Product } from '../../services/products.service'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../contexts/AuthContext'

export function ProducerDashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      ordersService.list({ limit: 5 }),
      productsService.list({ limit: 100 }),
    ]).then(([oRes, pRes]) => {
      setOrders(oRes.data)
      setProducts(pRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'PAID')
  const lowStock = products.filter((p) => p.stock <= 3 && p.is_available)
  const todayRevenue = orders
    .filter((o) => o.status === 'COMPLETED' && new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + Number(o.total_price), 0)

  return (
    <MainLayout>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 4 }}>
          Bonjour, {user?.first_name} 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Voici l'état de votre boutique.</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        {[
          { label: 'Commandes en attente', value: pendingOrders.length, color: 'var(--color-warning)', link: '/producer/orders' },
          { label: 'Produits en stock faible', value: lowStock.length, color: 'var(--color-danger)', link: '/producer/catalog' },
          { label: 'Chiffre du jour (€)', value: todayRevenue.toFixed(2), color: 'var(--color-success)', link: null },
          { label: 'Produits actifs', value: products.filter((p) => p.is_available).length, color: 'var(--color-primary)', link: '/producer/catalog' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-5)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', color: kpi.color, fontWeight: 700 }}>
              {kpi.value}
            </p>
            {kpi.link && (
              <Link to={kpi.link} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', marginTop: 8, display: 'block' }}>
                Voir →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Liens rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {[
          { to: '/producer/catalog', icon: '📦', label: 'Gérer le catalogue' },
          { to: '/producer/orders', icon: '🧾', label: 'Suivre les commandes' },
          { to: '/messages', icon: '💬', label: 'Messagerie' },
          { to: '/producer/profile', icon: '⚙️', label: 'Mon profil' },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'box-shadow var(--transition)',
              color: 'var(--color-dark)',
            }}
          >
            <span style={{ fontSize: 28 }}>{link.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Dernières commandes */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-5)' }}>
          Commandes récentes
        </h2>
        {loading ? (
          <p>Chargement…</p>
        ) : orders.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Aucune commande reçue.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{order.consumer_name}</strong>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    {Number(order.total_price).toFixed(2)} €
                  </div>
                </div>
                <Badge orderStatus={order.status} />
              </div>
            ))}
            <Link to="/producer/orders" style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              Voir toutes les commandes →
            </Link>
          </div>
        )}
      </section>
    </MainLayout>
  )
}
