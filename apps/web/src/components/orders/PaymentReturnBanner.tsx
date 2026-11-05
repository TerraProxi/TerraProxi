import { Link } from 'react-router-dom'
import type { PaymentReturn } from '../../hooks/usePaymentConfirmation'

interface Props {
  paymentReturn: PaymentReturn
  orderId: string
}

/** Bandeau affiché au retour de Stripe, le temps que le webhook confirme le paiement. */
export function PaymentReturnBanner({ paymentReturn, orderId }: Props) {
  switch (paymentReturn) {
    case 'none':
      return null
    case 'confirming':
      return (
        <p className="tp-alert tp-alert--success" role="status">
          Paiement accepté, merci ! Confirmation de la commande en cours…
        </p>
      )
    case 'confirmed':
      return (
        <p className="tp-alert tp-alert--success" role="status">
          Paiement confirmé : le producteur a été prévenu et va préparer votre commande.
        </p>
      )
    case 'delayed':
      return (
        <p className="tp-alert tp-alert--info" role="status">
          Paiement accepté. Sa confirmation prend un peu plus de temps que prévu : le statut sera mis à jour
          dans quelques instants, inutile de payer à nouveau.
        </p>
      )
    case 'failed':
      return (
        <div className="tp-alert tp-alert--error" role="alert">
          Le paiement n'a pas abouti. <Link to={`/checkout/${orderId}`}>Réessayer le paiement</Link>
        </div>
      )
  }
}
