import { useId } from 'react'
import type { DailyRevenue } from '../../services/producers.service'
import { formatDate, formatPrice } from '../../utils/format'

const WIDTH = 640
const HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 32, left: 64 }
const Y_TICKS = 4
const X_LABELS = 5

/** Jours AAAA-MM-JJ lus à midi pour éviter un décalage de fuseau à l'affichage. */
const dayLabel = (date: string, pattern = 'd MMM') => formatDate(`${date}T12:00:00`, pattern)

/** Graduation compacte : euros arrondis pour tenir dans la marge gauche. */
const axisPrice = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} €`

/** BO-5 — courbe quotidienne du chiffre d'affaires (SVG sans dépendance) avec sa table de données. */
export function RevenueChart({ daily }: { daily: DailyRevenue[] }) {
  const titleId = useId()
  const descId = useId()
  if (daily.length === 0) return <p className="tp-muted">Aucune donnée sur la période.</p>

  const innerWidth = WIDTH - PADDING.left - PADDING.right
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom
  const maxRevenue = Math.max(...daily.map((d) => d.revenue))
  // Maximum arrondi au multiple supérieur du nombre de graduations : des graduations en euros entiers
  const scaleMax = Math.max(Y_TICKS, Math.ceil(maxRevenue / Y_TICKS) * Y_TICKS)
  const total = daily.reduce((sum, d) => sum + d.revenue, 0)
  const bestDay = daily.reduce((best, d) => (d.revenue > best.revenue ? d : best), daily[0])

  const x = (index: number) => PADDING.left + (daily.length === 1 ? innerWidth / 2 : (index / (daily.length - 1)) * innerWidth)
  const y = (revenue: number) => PADDING.top + innerHeight - (revenue / scaleMax) * innerHeight
  const points = daily.map((d, i) => `${x(i)},${y(d.revenue)}`).join(' ')
  const area = `${x(0)},${y(0)} ${points} ${x(daily.length - 1)},${y(0)}`
  const xLabelStep = Math.max(1, Math.ceil(daily.length / X_LABELS))

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <title id={titleId}>Chiffre d'affaires quotidien sur {daily.length} jours</title>
        <desc id={descId}>
          Total {formatPrice(total)}.{' '}
          {maxRevenue > 0 ? `Meilleur jour : ${dayLabel(bestDay.date, 'd MMMM')}, ${formatPrice(bestDay.revenue)}.` : 'Aucune vente.'}
        </desc>

        {Array.from({ length: Y_TICKS + 1 }, (_, i) => {
          const value = (scaleMax / Y_TICKS) * i
          return (
            <g key={i}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y(value)} y2={y(value)} stroke="#E2EEE2" />
              <text x={PADDING.left - 8} y={y(value) + 4} textAnchor="end" fontSize="12" fill="#4B5563">
                {maxRevenue > 0 || i === 0 ? axisPrice(value) : ''}
              </text>
            </g>
          )
        })}

        {daily.map((d, i) => (i % xLabelStep === 0 || i === daily.length - 1) && (
          <text key={d.date} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize="12" fill="#4B5563">
            {dayLabel(d.date)}
          </text>
        ))}

        <polygon points={area} fill="var(--color-primary)" opacity="0.25" />
        <polyline points={points} fill="none" stroke="var(--color-primary-strong)" strokeWidth="2.5" strokeLinejoin="round" />
        {daily.map((d, i) => d.revenue > 0 && (
          <circle key={d.date} cx={x(i)} cy={y(d.revenue)} r="3.5" fill="var(--color-primary-strong)" />
        ))}
      </svg>

      <details style={{ marginTop: 'var(--space-3)' }}>
        <summary className="tp-small" style={{ cursor: 'pointer', fontWeight: 600 }}>Voir les données jour par jour</summary>
        <div className="tp-table-wrap" style={{ maxHeight: 280, overflowY: 'auto', marginTop: 'var(--space-2)' }}>
          <table className="tp-table">
            <caption className="sr-only">Chiffre d'affaires et commandes par jour</caption>
            <thead>
              <tr>
                <th scope="col">Jour</th>
                <th scope="col" className="tp-num">Commandes</th>
                <th scope="col" className="tp-num">Chiffre d'affaires</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date}>
                  <th scope="row" style={{ fontWeight: 400, color: 'var(--color-dark)' }}>{dayLabel(d.date, 'EEEE d MMMM')}</th>
                  <td className="tp-num">{d.orders}</td>
                  <td className="tp-num">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
