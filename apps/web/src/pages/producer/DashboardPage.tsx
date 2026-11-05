import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { ordersService, type Order, type OrderStatus } from '../../services/orders.service'
import { productsService, type Product } from '../../services/products.service'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { producersService } from '../../services/producers.service'
import { aiService, type ForecastLine } from '../../services/ai.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { formatPrice } from '../../utils/format'

/** Commandes qui représentent un encaissement (payées, quel que soit leur avancement). */
const PAID_STATUSES = new Set<OrderStatus>(['PAID', 'PREPARING', 'READY', 'COMPLETED'])
const LOW_STOCK_THRESHOLD = 3
const RECENT_ORDERS_LIMIT = 100
const RECENT_ORDERS_SHOWN = 5
const FORECAST_LINES_SHOWN = 5
const CONFIDENCE_LABELS = { HIGH: 'Bonne', MEDIUM: 'Moyenne', LOW: 'Faible' } as const

const QUICK_LINKS = [
  { to: '/producer/catalog', icon: '📦', label: 'Gérer le catalogue' },
  { to: '/producer/orders', icon: '🧾', label: 'Suivre les commandes' },
  { to: '/messages', icon: '💬', label: 'Messagerie' },
  { to: '/producer/profile', icon: '⚙️', label: 'Mon profil' },
]

export function ProducerDashboardPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [forecast, setForecast] = useState<ForecastLine[]>([])
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forecastError, setForecastError] = useState<string | null>(null)

  useEffect(() => {
    producersService.me()
      .then(async ({ data: producer }) => {
        // Chaque bloc se dégrade seul : une prévision indisponible ne masque pas les commandes
        const [ordersRes, productsRes, forecastRes] = await Promise.allSettled([
          ordersService.list({ limit: RECENT_ORDERS_LIMIT }),
          productsService.mine(),
          aiService.forecast(producer.id),
        ])
        if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data)
        else setError(apiErrorMessage(ordersRes.reason, 'Impossible de charger vos commandes'))
        if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data)
        else setError(apiErrorMessage(productsRes.reason, 'Impossible de charger votre catalogue'))
        if (forecastRes.status === 'fulfilled') setForecast(forecastRes.value.data)
        else setForecastError(apiErrorMessage(forecastRes.reason, 'Prévisions indisponibles pour le moment'))
      })
      .catch((err) => {
        if (apiErrorStatus(err) === 404) setHasProfile(false)
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
  const topForecast = forecast.filter((f) => f.forecast_next_week > 0).slice(0, FORECAST_LINES_SHOWN)

  if (!loading && !hasProfile) {
    return (
      <MainLayout title="Mon espace producteur">
        <h1 className="tp-page-title">Bienvenue sur TerraProxi 👋</h1>
        <p style={{ marginBottom: 'var(--space-4)' }}>
          Première étape : créez votre fiche producteur pour apparaître sur la carte et vendre vos produits.
        </p>
        <Link to="/producer/profile" className="tp-btn tp-btn--secondary tp-btn--md">Créer ma fiche producteur</Link>
      </MainLayout>
    )
  }

  // Couleurs de valeur : variantes foncées (≥ 4,5:1 sur blanc)
  const kpis = [
    { label: 'Commandes à préparer', value: String(toPrepare.length), color: 'var(--color-warning-strong)', link: '/producer/orders' },
    { label: 'Produits en stock faible', value: String(lowStock.length), color: 'var(--color-danger-strong)', link: '/producer/catalog' },
    { label: 'Chiffre du jour', value: formatPrice(todayRevenue), color: 'var(--color-secondary-strong)', link: null },
    { label: 'Produits actifs', value: String(products.filter((p) => p.is_available).length), color: 'var(--color-primary-strong)', link: '/producer/catalog' },
  ]

  return (
    <MainLayout title="Mon espace producteur">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 className="tp-page-title" style={{ marginBottom: 4 }}>Bonjour, {user?.first_name} 👋</h1>
        <p className="tp-muted">Voici l'état de votre boutique.</p>
      </div>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

      <div className="tp-card-grid" style={{ marginBottom: 'var(--space-8)' }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="tp-card">
            <p className="tp-small tp-muted" style={{ marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', color: kpi.color, fontWeight: 700 }}>
              {loading ? '…' : kpi.value}
            </p>
            {kpi.link && (
              <Link to={kpi.link} className="tp-small" style={{ marginTop: 8, display: 'block' }}>
                Voir<span className="sr-only"> : {kpi.label}</span> →
              </Link>
            )}
          </div>
        ))}
      </div>

      <nav aria-label="Raccourcis" className="tp-card-grid" style={{ marginBottom: 'var(--space-8)' }}>
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="tp-card"
            style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-dark)', textDecoration: 'none' }}
          >
            <span aria-hidden="true" style={{ fontSize: 28 }}>{link.icon}</span>
            <span className="tp-small" style={{ fontWeight: 600 }}>{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Prévisions (AI-1) */}
      <section className="tp-card" aria-labelledby="titre-previsions" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 id="titre-previsions" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Prévisions de la semaine prochaine</h2>
        <p className="tp-small tp-muted" style={{ marginBottom: 'var(--space-4)' }}>
          Moyenne de vos ventes terminées sur les 8 dernières semaines.
        </p>
        {forecastError ? (
          <p className="tp-muted">{forecastError}</p>
        ) : topForecast.length === 0 ? (
          <p className="tp-muted">Pas encore assez de ventes pour estimer la demande.</p>
        ) : (
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead>
                <tr>
                  <th scope="col">Produit</th>
                  <th scope="col">Prévision</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Fiabilité</th>
                </tr>
              </thead>
              <tbody>
                {topForecast.map((f) => {
                  const needsRestock = f.stock < f.forecast_next_week
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.name}</td>
                      <td>{f.forecast_next_week} × {f.unit}</td>
                      <td style={{ color: needsRestock ? 'var(--color-danger-strong)' : undefined }}>
                        {f.stock}{needsRestock ? ' — à réapprovisionner' : ''}
                      </td>
                      <td>{CONFIDENCE_LABELS[f.confidence]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="titre-recentes">
        <h2 id="titre-recentes" className="tp-section-title" style={{ fontSize: 'var(--text-xl)' }}>Commandes récentes</h2>
        {loading ? (
          <p>Chargement…</p>
        ) : orders.length === 0 ? (
          <p className="tp-muted">Aucune commande reçue.</p>
        ) : (
          <div className="tp-stack" style={{ gap: 'var(--space-3)' }}>
            {orders.slice(0, RECENT_ORDERS_SHOWN).map((order) => (
              <Link
                key={order.id}
                to={`/producer/orders/${order.id}`}
                className="tp-order-card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-dark)', textDecoration: 'none' }}
              >
                <span>
                  <strong>{order.consumer_name}</strong>
                  <span className="tp-small tp-muted" style={{ display: 'block' }}>{formatPrice(order.total_price)}</span>
                </span>
                <Badge orderStatus={order.status} />
              </Link>
            ))}
            <Link to="/producer/orders" className="tp-small" style={{ fontWeight: 600, textAlign: 'center' }}>
              Voir toutes les commandes →
            </Link>
          </div>
        )}
      </section>
    </MainLayout>
  )
}
