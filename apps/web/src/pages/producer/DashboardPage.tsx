import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { RevenueChart } from '../../components/producer/RevenueChart'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { ordersService, type Order } from '../../services/orders.service'
import { producersService, type ProducerStats } from '../../services/producers.service'
import { aiService, type ForecastLine } from '../../services/ai.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { formatPrice } from '../../utils/format'

const PERIODS = [7, 30, 90] as const
type Period = (typeof PERIODS)[number]
const DEFAULT_PERIOD: Period = 30
const RECENT_ORDERS_SHOWN = 5
const FORECAST_LINES_SHOWN = 5
const CONFIDENCE_LABELS = { HIGH: 'Bonne', MEDIUM: 'Moyenne', LOW: 'Faible' } as const

const QUICK_LINKS = [
  { to: '/producer/catalog', icon: '📦', label: 'Gérer le catalogue' },
  { to: '/producer/orders', icon: '🧾', label: 'Suivre les commandes' },
  { to: '/producer/agenda', icon: '📅', label: 'Mon agenda' },
  { to: '/producer/newsletter', icon: '📰', label: 'Newsletter' },
  { to: '/messages', icon: '💬', label: 'Messagerie' },
  { to: '/producer/profile', icon: '⚙️', label: 'Mon profil' },
]

/** BO-1 / BO-5 — tableau de bord calculé par l'API (GET /producers/me/stats). */
export function ProducerDashboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD)
  const [stats, setStats] = useState<ProducerStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [hasProfile, setHasProfile] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [forecast, setForecast] = useState<ForecastLine[]>([])
  const [forecastError, setForecastError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    setIsLoadingStats(true)
    producersService.stats(period)
      .then(({ data }) => { if (isCurrent) { setStats(data); setStatsError(null) } })
      .catch((err) => {
        if (!isCurrent) return
        if (apiErrorStatus(err) === 404) setHasProfile(false)
        else setStatsError(apiErrorMessage(err, 'Impossible de charger vos statistiques'))
      })
      .finally(() => { if (isCurrent) setIsLoadingStats(false) })
    return () => { isCurrent = false }
  }, [period, reloadKey])

  // Blocs secondaires : chacun se dégrade seul
  useEffect(() => {
    ordersService.list({ limit: RECENT_ORDERS_SHOWN })
      .then(({ data }) => setOrders(data))
      .catch((err) => setOrdersError(apiErrorMessage(err, 'Commandes récentes indisponibles')))
    producersService.me()
      .then(({ data: producer }) => aiService.forecast(producer.id))
      .then(({ data }) => setForecast(data))
      .catch((err) => setForecastError(apiErrorMessage(err, 'Prévisions indisponibles pour le moment')))
  }, [])

  if (!hasProfile) {
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

  const topForecast = forecast.filter((f) => f.forecast_next_week > 0).slice(0, FORECAST_LINES_SHOWN)
  // Couleurs de valeur : variantes foncées (≥ 4,5:1 sur blanc)
  const kpis = stats ? [
    { label: 'Chiffre du jour', value: formatPrice(stats.revenue_today), color: 'var(--color-secondary-strong)', link: null },
    { label: 'Commandes du jour', value: String(stats.orders_today), color: 'var(--color-primary-strong)', link: null },
    { label: `Panier moyen (${period} j)`, value: formatPrice(stats.average_basket), color: 'var(--color-primary-strong)', link: null },
    { label: 'Commandes à préparer', value: String(stats.orders_to_prepare), color: 'var(--color-warning-strong)', link: '/producer/orders' },
    { label: 'Produits en stock bas', value: String(stats.low_stock.length), color: 'var(--color-danger-strong)', link: '/producer/catalog' },
  ] : []

  return (
    <MainLayout title="Mon espace producteur">
      <div className="tp-page-header">
        <div>
          <h1 className="tp-page-title" style={{ marginBottom: 4 }}>Bonjour, {user?.first_name} 👋</h1>
          <p className="tp-muted">Voici l'état de votre boutique.</p>
        </div>
        <div className="tp-cluster" role="group" aria-label="Période des statistiques">
          {PERIODS.map((days) => (
            <button key={days} type="button" className="tp-chip" aria-pressed={period === days} onClick={() => setPeriod(days)}>
              {days} jours
            </button>
          ))}
        </div>
      </div>

      {statsError && (
        <div className="tp-alert tp-alert--error" role="alert">
          {statsError} <Button variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Réessayer</Button>
        </div>
      )}

      <div className="tp-card-grid" style={{ marginBottom: 'var(--space-8)' }} aria-busy={isLoadingStats}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="tp-card">
            <p className="tp-small tp-muted" style={{ marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', color: kpi.color, fontWeight: 700 }}>
              {kpi.value}
            </p>
            {kpi.link && (
              <Link to={kpi.link} className="tp-small" style={{ marginTop: 8, display: 'block' }}>
                Voir<span className="sr-only"> : {kpi.label}</span> →
              </Link>
            )}
          </div>
        ))}
        {isLoadingStats && !stats && <p>Chargement des statistiques…</p>}
      </div>

      {stats && (
        <div className="tp-split" style={{ marginBottom: 'var(--space-8)' }}>
          <section className="tp-card" aria-labelledby="titre-courbe">
            <h2 id="titre-courbe" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-1)' }}>Ventes des {stats.period_days} derniers jours</h2>
            <p className="tp-small tp-muted" style={{ marginBottom: 'var(--space-4)' }}>
              {formatPrice(stats.revenue_period)} encaissés · {stats.orders_period} commande{stats.orders_period > 1 ? 's' : ''}
            </p>
            <RevenueChart daily={stats.daily} />
          </section>

          <div className="tp-stack">
            <section className="tp-card" aria-labelledby="titre-top">
              <h2 id="titre-top" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Meilleures ventes</h2>
              {stats.top_products.length === 0 ? (
                <p className="tp-muted tp-small">Aucune vente sur la période.</p>
              ) : (
                <ol style={{ paddingLeft: 'var(--space-5)' }} className="tp-stack tp-small">
                  {stats.top_products.map((p) => (
                    <li key={p.product_id ?? p.product_name}>
                      <strong>{p.product_name}</strong> — {p.quantity} vendu{p.quantity > 1 ? 's' : ''}, {formatPrice(p.revenue)}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="tp-card" aria-labelledby="titre-stock">
              <h2 id="titre-stock" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
                Stock bas (≤ {stats.low_stock_threshold})
              </h2>
              {stats.low_stock.length === 0 ? (
                <p className="tp-muted tp-small">Aucun produit en stock bas.</p>
              ) : (
                <ul style={{ listStyle: 'none' }} className="tp-stack tp-small">
                  {stats.low_stock.map((p) => (
                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Link to="/producer/catalog">{p.name}</Link>
                      <span style={{ color: 'var(--color-danger-strong)', fontWeight: 600 }}>{p.stock} {p.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

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
        {ordersError ? (
          <p className="tp-muted">{ordersError}</p>
        ) : orders.length === 0 ? (
          <p className="tp-muted">Aucune commande reçue.</p>
        ) : (
          <div className="tp-stack" style={{ gap: 'var(--space-3)' }}>
            {orders.map((order) => (
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
