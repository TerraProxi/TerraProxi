import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { AssistantReply, type AssistantMessage } from '../../components/assistant/AssistantReply'
import { useCart } from '../../contexts/CartContext'
import { useGeolocation } from '../../hooks/useGeolocation'
import { aiService, type ChatHistoryItem, type ProductPick } from '../../services/ai.service'
import { applyCartActions, buildCartContext, resolvedToCartProduct } from '../../services/ai-cart'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'

const HISTORY_LENGTH = 10
const MESSAGE_MAX_LENGTH = 2000
const SEARCH_RADIUS_KM = 50

const WELCOME: AssistantMessage = {
  id: 'bienvenue',
  role: 'assistant',
  text: 'Bonjour ! Je suis l\'assistant TerraProxi. Je vous aide à trouver des producteurs locaux, des produits de '
    + 'saison, des idées de recettes, et **je peux remplir votre panier** si vous me le demandez. '
    + 'Que recherchez-vous aujourd\'hui ?',
}

const STARTER_PROMPTS = [
  'Légumes de saison près de chez moi',
  'Fromages locaux',
  'Une recette avec des tomates',
  'Ajoute du jus de pomme à mon panier',
]

const UNAVAILABLE_MESSAGE = 'L\'assistant n\'est pas disponible pour le moment (service IA non configuré ou indisponible). '
  + 'Vous pouvez parcourir les produits et la carte en attendant.'

const toHistory = (messages: AssistantMessage[]): ChatHistoryItem[] =>
  messages
    .filter((m) => m.id !== WELCOME.id && !m.isError)
    .slice(-HISTORY_LENGTH)
    .map((m) => ({ role: m.role, content: m.text }))

let messageSequence = 0
const nextId = (prefix: string) => `${prefix}-${++messageSequence}`

/** AI-3 — assistant conversationnel (POST /ai/chat), même contrat que l'écran mobile. */
export function AssistantPage() {
  const cart = useCart()
  const { lat, lon, loading: isLocating, error: geoError, request: requestPosition } = useGeolocation()
  const [messages, setMessages] = useState<AssistantMessage[]>([WELCOME])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [cartNotice, setCartNotice] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = async (content: string) => {
    const text = content.trim()
    if (!text || isSending) return
    const userMessage: AssistantMessage = { id: nextId('moi'), role: 'user', text }
    setMessages((list) => [...list, userMessage])
    setDraft('')
    setCartNotice('')
    setIsSending(true)

    try {
      const { data } = await aiService.chat({
        message: text,
        history: toHistory(messages),
        cart_context: buildCartContext(cart.groups, cart.total, cart.count),
        ...(lat != null && lon != null && { lat, lon, radius_km: SEARCH_RADIUS_KM }),
      })
      const cartFeedback = applyCartActions(data.cart_actions, cart)
      setMessages((list) => [...list, {
        id: nextId('assistant'),
        role: 'assistant',
        text: data.reply,
        producerLinks: data.producer_links,
        productPicks: data.product_picks,
        quickReplies: data.quick_replies,
        cartFeedback,
      }])
    } catch (err) {
      const isServiceDown = apiErrorStatus(err) === 503
      if (isServiceDown) setIsUnavailable(true)
      setMessages((list) => [...list, {
        id: nextId('erreur'),
        role: 'assistant',
        isError: true,
        text: isServiceDown ? UNAVAILABLE_MESSAGE : apiErrorMessage(err, 'Je n\'ai pas pu répondre, réessayez dans un instant.'),
      }])
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(draft)
  }

  const addPick = (pick: ProductPick, quantity: number) => {
    cart.add(resolvedToCartProduct(pick), quantity)
    setCartNotice(`${pick.name} × ${quantity} ${pick.unit} ajouté au panier`)
  }

  const clearConversation = () => {
    if (window.confirm('Effacer toute la conversation ?')) setMessages([WELCOME])
  }

  const hasConversation = messages.length > 1
  const isLocated = lat != null && lon != null

  return (
    <MainLayout title="Assistant">
      <div className="tp-chat">
        <div className="tp-page-header">
          <h1 className="tp-page-title">🤖 Assistant TerraProxi</h1>
          <div className="tp-cluster">
            <Link to="/cart" className="tp-btn tp-btn--ghost tp-btn--sm">🛒 Panier ({cart.count})</Link>
            {hasConversation && (
              <Button variant="ghost" size="sm" onClick={clearConversation} disabled={isSending}>Effacer</Button>
            )}
          </div>
        </div>

        <div className="tp-cluster tp-small">
          {isLocated ? (
            <span className="tp-muted" role="status">📍 Suggestions autour de votre position ({SEARCH_RADIUS_KM} km)</span>
          ) : (
            <Button variant="outline" size="sm" onClick={requestPosition} loading={isLocating}>
              📍 Utiliser ma position
            </Button>
          )}
          {geoError && <span className="tp-field-error" role="alert">{geoError}</span>}
        </div>

        <div className="tp-chat__log" role="log" aria-live="polite" aria-label="Conversation avec l'assistant">
          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="tp-chat__msg tp-chat__msg--user">
                <div className="tp-chat__bubble"><span className="sr-only">Vous : </span>{message.text}</div>
              </div>
            ) : (
              <AssistantReply key={message.id} message={message} isBusy={isSending} onQuickReply={send} onPickAdd={addPick} />
            ),
          )}
          {isSending && <p className="tp-muted tp-small" role="status">L'assistant réfléchit…</p>}
          <div ref={bottomRef} />
        </div>

        {!hasConversation && (
          <div className="tp-cluster" role="group" aria-label="Exemples de questions">
            {STARTER_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" className="tp-chip" onClick={() => send(prompt)} disabled={isSending}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Région toujours présente pour que l'ajout soit annoncé par les lecteurs d'écran */}
        <p role="status" className={cartNotice ? 'tp-alert tp-alert--success' : 'sr-only'}>
          {cartNotice && `✓ ${cartNotice}`}
        </p>

        {isUnavailable && (
          <p className="tp-small tp-muted">
            En attendant : <Link to="/products">tous les produits</Link> · <Link to="/map">la carte des producteurs</Link>
          </p>
        )}

        <form className="tp-card" onSubmit={handleSubmit} style={{ padding: 'var(--space-4)' }}>
          <label htmlFor="question-assistant" className="tp-label">Votre question</label>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)', alignItems: 'flex-end' }}>
            <textarea
              id="question-assistant"
              ref={inputRef}
              className="tp-input"
              rows={2}
              maxLength={MESSAGE_MAX_LENGTH}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft)
                }
              }}
              aria-describedby="aide-assistant"
            />
            <Button type="submit" variant="primary" loading={isSending} disabled={!draft.trim()}>Envoyer</Button>
          </div>
          <p id="aide-assistant" className="tp-hint" style={{ marginTop: 'var(--space-2)' }}>
            Entrée pour envoyer, Maj + Entrée pour aller à la ligne. N'indiquez pas d'informations personnelles.
          </p>
        </form>
      </div>
    </MainLayout>
  )
}
