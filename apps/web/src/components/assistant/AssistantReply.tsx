import { Link } from 'react-router-dom'
import { ChatText } from './ChatText'
import type { ProducerLink, ProductPick } from '../../services/ai.service'
import { formatPrice } from '../../utils/format'

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  isError?: boolean
  producerLinks?: ProducerLink[]
  productPicks?: ProductPick[]
  quickReplies?: string[]
  cartFeedback?: string[]
}

interface Props {
  message: AssistantMessage
  isBusy: boolean
  onQuickReply: (text: string) => void
  onPickAdd: (pick: ProductPick, quantity: number) => void
}

export function AssistantReply({ message, isBusy, onQuickReply, onPickAdd }: Props) {
  const { producerLinks = [], productPicks = [], quickReplies = [], cartFeedback = [] } = message

  return (
    <div className="tp-chat__msg tp-chat__msg--assistant tp-stack" style={{ gap: 'var(--space-2)' }}>
      <div className={`tp-chat__bubble ${message.isError ? 'tp-alert--error' : ''}`}>
        <span className="sr-only">Assistant : </span>
        <ChatText text={message.text} />
      </div>

      {cartFeedback.length > 0 && (
        <ul className="tp-alert tp-alert--success" style={{ listStyle: 'none', marginBottom: 0 }}>
          {cartFeedback.map((line) => <li key={line}>✓ {line}</li>)}
        </ul>
      )}

      {producerLinks.length > 0 && (
        <ul className="tp-stack" style={{ listStyle: 'none', gap: 'var(--space-2)' }}>
          {producerLinks.map((link) => (
            <li key={link.producer_id}>
              <Link to={`/producers/${link.producer_id}`} className="tp-producer-item" style={{ marginBottom: 0 }}>
                <strong>{link.company_name}{link.city && <span className="tp-muted" style={{ fontWeight: 400 }}> — {link.city}</span>}</strong>
                <span className="tp-small tp-muted">{link.reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {productPicks.length > 0 && (
        <ul className="tp-stack" style={{ listStyle: 'none', gap: 'var(--space-2)' }} aria-label="Produits suggérés">
          {productPicks.map((pick) => (
            <li key={pick.product_id} className="tp-pick">
              <span>
                <Link to={`/products/${pick.product_id}`} style={{ fontWeight: 700 }}>{pick.name}</Link>
                <span className="tp-small tp-muted" style={{ display: 'block' }}>
                  {formatPrice(pick.price)} / {pick.unit} · {pick.producer_name}
                </span>
              </span>
              <span className="tp-cluster" style={{ gap: 'var(--space-2)' }}>
                {pick.quantity_options.map((quantity) => (
                  <button
                    key={quantity}
                    type="button"
                    className="tp-btn tp-btn--outline tp-btn--sm"
                    disabled={isBusy}
                    onClick={() => onPickAdd(pick, quantity)}
                  >
                    + {quantity}<span className="sr-only"> {pick.unit} de {pick.name} au panier</span>
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {quickReplies.length > 0 && (
        <div className="tp-cluster" role="group" aria-label="Réponses suggérées" style={{ gap: 'var(--space-2)' }}>
          {quickReplies.map((reply) => (
            <button key={reply} type="button" className="tp-chip" disabled={isBusy} onClick={() => onQuickReply(reply)}>
              {reply}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
