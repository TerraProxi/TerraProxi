import { useState } from 'react'
import { Button } from '../ui/Button'
import {
  PRODUCER_TRANSITIONS,
  TRANSITION_ACTION_LABELS,
  ordersService,
  type ManualOrderStatus,
  type Order,
} from '../../services/orders.service'
import { apiErrorMessage } from '../../services/api'

interface Props {
  order: Order
  onUpdated: (order: Order) => void
  onError: (message: string) => void
}

/** ORDER-4 — transitions permises au producteur, annulation comprise (sauf une fois la commande prête). */
export function ProducerOrderActions({ order, onUpdated, onError }: Props) {
  const [pendingStatus, setPendingStatus] = useState<ManualOrderStatus | null>(null)

  const apply = async (status: ManualOrderStatus) => {
    const isCancel = status === 'CANCELLED'
    if (isCancel && !window.confirm('Annuler cette commande ? Les quantités seront remises en stock.')) return
    setPendingStatus(status)
    try {
      const { data } = await ordersService.updateStatus(order.id, status)
      onUpdated(data)
    } catch (err) {
      onError(apiErrorMessage(err, 'Mise à jour du statut impossible'))
    } finally {
      setPendingStatus(null)
    }
  }

  return (
    <>
      {PRODUCER_TRANSITIONS[order.status].map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === 'CANCELLED' ? 'danger-ghost' : 'primary'}
          loading={pendingStatus === status}
          disabled={pendingStatus !== null}
          onClick={() => apply(status)}
        >
          {TRANSITION_ACTION_LABELS[status]}
        </Button>
      ))}
    </>
  )
}
