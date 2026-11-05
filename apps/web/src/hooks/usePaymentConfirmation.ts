import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ordersService, type Order } from '../services/orders.service'

/** Le webhook Stripe passe la commande en PAID quelques secondes après la redirection. */
const POLL_INTERVAL_MS = 2_000
const MAX_POLL_ATTEMPTS = 10

/** Statuts renvoyés par Stripe dans `redirect_status` après confirmPayment. */
const SUCCESS_REDIRECT_STATUSES = new Set(['succeeded', 'processing'])

export type PaymentReturn = 'none' | 'confirming' | 'confirmed' | 'delayed' | 'failed'

/**
 * Retour de Stripe (return_url = /orders/:id?redirect_status=…) : lit puis retire les paramètres
 * de l'URL, et interroge la commande jusqu'à ce que le webhook l'ait marquée payée.
 */
export function usePaymentConfirmation(order: Order | null, onOrderRefreshed: (order: Order) => void) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturn>(() => {
    const redirectStatus = searchParams.get('redirect_status')
    if (!redirectStatus) return 'none'
    return SUCCESS_REDIRECT_STATUSES.has(redirectStatus) ? 'confirming' : 'failed'
  })

  // Le secret client Stripe n'a pas à rester dans l'historique du navigateur
  useEffect(() => {
    if (searchParams.has('redirect_status')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  const orderId = order?.id
  const isPending = order?.status === 'PENDING'

  useEffect(() => {
    if (paymentReturn !== 'confirming' || !orderId) return
    if (!isPending) {
      setPaymentReturn('confirmed')
      return
    }
    let attempts = 0
    const timer = window.setInterval(async () => {
      attempts += 1
      try {
        const { data } = await ordersService.getById(orderId)
        onOrderRefreshed(data)
      } catch {
        // Une erreur réseau ponctuelle n'interrompt pas l'attente : la tentative suivante réessaie
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        window.clearInterval(timer)
        setPaymentReturn((current) => (current === 'confirming' ? 'delayed' : current))
      }
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paymentReturn, orderId, isPending, onOrderRefreshed])

  return paymentReturn
}
