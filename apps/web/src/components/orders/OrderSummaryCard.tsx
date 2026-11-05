import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { DELIVERY_MODE_LABELS, type Order } from '../../services/orders.service'
import { formatDateTime, formatPrice } from '../../utils/format'

interface Props {
  order: Order
  /** Nom affiché en titre : le producteur pour un client, le client pour un producteur. */
  counterpartName: string
  detailPath: string
  /** Actions propres au rôle (payer, annuler, faire avancer…). */
  children?: ReactNode
}

export function OrderSummaryCard({ order, counterpartName, detailPath, children }: Props) {
  return (
    <article className="tp-order-card">
      <div className="tp-order-card__head">
        <div>
          <h2 style={{ fontSize: 'var(--text-base)' }}>{counterpartName}</h2>
          <div className="tp-small tp-muted">{formatDateTime(order.created_at)}</div>
        </div>
        <Badge orderStatus={order.status} />
      </div>

      <p className="tp-small tp-muted" style={{ marginBottom: 'var(--space-3)' }}>
        {order.items?.map((item) => `${item.quantity}× ${item.product_name}`).join(', ')}
        {' · '}
        {DELIVERY_MODE_LABELS[order.delivery_mode]}
      </p>

      <div className="tp-order-card__foot">
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{formatPrice(order.total_price)}</span>
        <div className="tp-cluster" style={{ gap: 'var(--space-2)' }}>
          {children}
          <Link to={detailPath} className="tp-btn tp-btn--ghost tp-btn--sm">
            Détail<span className="sr-only"> de la commande {counterpartName} du {formatDateTime(order.created_at)}</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
