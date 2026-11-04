import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MainLayout } from '../../components/layout/MainLayout'
import { ordersService, type Order } from '../../services/orders.service'
import { productsService, type Product } from '../../services/products.service'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { producersService } from '../../services/producers.service'
import { aiService, type ForecastLine } from '../../services/ai.service'
import { apiErrorMessage } from '../../services/api'

/** Commandes qui représentent un encaissement (payées, quel que soit leur avancement). */
const PAID_STATUSES = new Set(['PAID', 'PREPARING', 'READY', 'COMPLETED'])
const LOW_STOCK_THRESHOLD = 3
const RECENT_ORDERS_LIMIT = 100
const CONFIDENCE_LABELS = { HIGH: 'Bonne', MEDIUM: 'Moyenne', LOW: 'Faible' } as const

export function ProducerDashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [forecast, setForecast] = useState<ForecastLine[]>([])
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    producersService.me()
      .then(async ({ data: producer }) => {
        const [oRes, pRes, fRes] = await Promise.all([
          ordersService.list({ limit: RECENT_ORDERS_LIMIT }),
          productsService.mine(),
          aiService.forecast(producer.id),
        ])
        setOrders(oRes.data)
        setProducts(pRes.data)
        setForecast(fRes.data)
      })
      .catch((err) => {
        if (err instanceof AxiosError && err.response?.status === 404) setHasProfile(false)
        else setError(apiErrorMessage(err, 'Impossible de charger le tableau de bord'))
      })
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toDateString()
  const toPrepare = orders.filter((o) => o.status === 'PAID' || o.status === 'PREPARING')
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD && p.is_available)
  const todayRevenue = orders
    .filter((o) => PAID_STATUSES.has(o.status) && new Date(o.created_at).toDateString() === today)
    .reduce((sum, o) => sum + Number(o.total_price), 0)
  const topForecast = forecast.filter((f) => f.forecast_next_week > 0).slice(0, 5)

  if (!loading && !hasProfile) {
    return (
      <MainLayout>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>Bienvenue sur TerraProxi 👋</h1>
        <p style={{ marginBottom: 'var(--space-4)' }}>
          Première étape : créez votre fiche producteur pour apparaître sur la carte et vendre vos produits.
        </p>
        <Link to="/producer/profile" className="tp-btn tp-btn--secondary tp-btn--md">Créer ma fiche producteur</Link>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 4 }}>
          Bonjour, {user?.first_name} 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Voici l'état de votre boutique.</p>
      </div>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        {[
          { label: 'Commandes à préparer', value: toPrepare.length, color: 'var(--color-warning)', link: '/producer/orders' },
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

      {/* Prévisions (AI-1) */}
      <section className="tp-card" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Prévisions de la semaine prochaine</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Moyenne de vos ventes terminées sur les 8 dernières semaines.
        </p>
        {topForecast.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Pas encore assez de ventes pour estimer la demande.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)' }}>
                <th scope="col" style={{ padding: '6px 4px' }}>Produit</th>
                <th scope="col" style={{ padding: '6px 4px' }}>Prévision</th>
                <th scope="col" style={{ padding: '6px 4px' }}>Stock</th>
                <th scope="col" style={{ padding: '6px 4px' }}>Fiabilité</th>
              </tr>
            </thead>
            <tbody>
              {topForecast.map((f) => {
                const needsRestock = f.stock < f.forecast_next_week
                return (
                  <tr key={f.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>{f.name}</td>
                    <td style={{ padding: '8px 4px' }}>{f.forecast_next_week} × {f.unit}</td>
                    <td style={{ padding: '8px 4px', color: needsRestock ? '#B91C1C' : undefined }}>
                      {f.stock}{needsRestock ? ' — à réapprovisionner' : ''}
                    </td>
                    <td style={{ padding: '8px 4px' }}>{CONFIDENCE_LABELS[f.confidence]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

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
