import { useEffect, useState } from 'react'
import { adminService, type PlatformStats } from '../../services/admin.service'
import { apiErrorMessage } from '../../services/api'
import { formatPrice } from '../../utils/format'

/** Indicateurs de la plateforme (GET /admin/stats) ; `refreshKey` force le rechargement après une action. */
export function AdminStatsCards({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminService.stats()
      .then(({ data }) => { setStats(data); setError(null) })
      .catch((err) => setError(apiErrorMessage(err, 'Indicateurs indisponibles')))
  }, [refreshKey])

  if (error) return <p className="tp-alert tp-alert--error" role="alert">{error}</p>
  if (!stats) return <p>Chargement des indicateurs…</p>

  const cards = [
    { label: 'Consommateurs', value: String(stats.consumers) },
    { label: 'Producteurs', value: String(stats.producers) },
    { label: 'Producteurs à vérifier', value: String(stats.producers_to_verify) },
    { label: 'Comptes suspendus', value: String(stats.inactive_users) },
    { label: 'Produits', value: String(stats.products) },
    { label: 'Commandes payées', value: String(stats.paid_orders) },
    { label: 'Commandes payées (30 j)', value: String(stats.paid_orders_30d) },
    { label: 'Chiffre d\'affaires encaissé', value: formatPrice(stats.paid_revenue) },
  ]

  return (
    <dl className="tp-card-grid">
      {cards.map((card) => (
        <div key={card.label} className="tp-card">
          <dt className="tp-small tp-muted">{card.label}</dt>
          <dd style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-primary-strong)' }}>
            {card.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
