import { ORDER_STATUS_LABELS, ORDER_STEPS, type OrderStatus } from '../../services/orders.service'

/**
 * Position de la commande dans son cycle de vie. L'API ne fournit pas d'historique horodaté
 * des statuts : on affiche les étapes franchies et l'étape courante.
 */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return <p className="tp-alert tp-alert--error" style={{ marginBottom: 0 }}>Cette commande a été annulée ; les quantités ont été remises en stock.</p>
  }

  const currentIndex = ORDER_STEPS.indexOf(status)
  return (
    <ol className="tp-steps">
      {ORDER_STEPS.map((step, index) => {
        const isCurrent = index === currentIndex
        const isDone = index < currentIndex
        return (
          <li key={step} aria-current={isCurrent ? 'step' : undefined} data-state={isDone ? 'done' : undefined}>
            {isDone && <span aria-hidden="true">✓ </span>}
            {ORDER_STATUS_LABELS[step]}
            {isDone && <span className="sr-only"> (étape franchie)</span>}
          </li>
        )
      })}
    </ol>
  )
}
