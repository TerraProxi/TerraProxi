import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { messagesService, type Conversation, type Message } from '../../services/messages.service'
import { apiErrorMessage } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/format'

/** MSG-2 — le fil ouvert est rafraîchi toutes les 10 s tant que l'onglet est visible. */
const THREAD_POLL_INTERVAL_MS = 10_000
const MESSAGE_MAX_LENGTH = 4000

export function MessagesPage() {
  const { partnerId } = useParams<{ partnerId?: string }>()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [threadError, setThreadError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(() => {
    messagesService.conversations()
      .then(({ data }) => { setConversations(data); setConversationsError(null) })
      .catch((err) => setConversationsError(apiErrorMessage(err, 'Impossible de charger vos conversations')))
  }, [])

  const loadThread = useCallback(async (id: string) => {
    try {
      const { data } = await messagesService.thread(id)
      setMessages(data)
      setThreadError(null)
    } catch (err) {
      setThreadError(apiErrorMessage(err, 'Impossible de charger la conversation'))
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    setMessages([])
    setSendError(null)
    if (!partnerId) return
    loadThread(partnerId)
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      loadThread(partnerId)
      loadConversations()
    }, THREAD_POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [partnerId, loadThread, loadConversations])

  // Défile vers le bas uniquement quand un message arrive
  const lastMessageId = messages[messages.length - 1]?.id
  useEffect(() => {
    if (lastMessageId) bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [lastMessageId])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!partnerId || !content) return
    setSending(true)
    setSendError(null)
    try {
      await messagesService.send(partnerId, content)
      setNewMessage('')
      await loadThread(partnerId)
      loadConversations()
    } catch (err) {
      setSendError(apiErrorMessage(err, 'Message non envoyé, réessayez'))
    } finally {
      setSending(false)
    }
  }

  const partnerName = conversations.find((c) => c.partner_id === partnerId)?.partner_name ?? 'Nouvelle conversation'

  return (
    <MainLayout title="Messages" fullWidth>
      <h1 className="sr-only">Messages</h1>
      <div className="tp-messages" data-has-thread={Boolean(partnerId)}>
        <nav className="tp-messages__list" aria-label="Conversations">
          <h2 style={{ fontSize: 'var(--text-lg)', padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
            💬 Conversations
          </h2>
          {conversationsError && <p className="tp-alert tp-alert--error" role="alert" style={{ margin: 'var(--space-4)' }}>{conversationsError}</p>}
          {conversations.length === 0 && !conversationsError ? (
            <p className="tp-small tp-muted" style={{ padding: 'var(--space-5)' }}>
              Aucune conversation. Contactez un producteur depuis sa page.
            </p>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.partner_id}
                to={`/messages/${conv.partner_id}`}
                className="tp-conversation"
                aria-current={conv.partner_id === partnerId ? 'page' : undefined}
              >
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong className="tp-small" style={{ fontFamily: 'var(--font-heading)' }}>{conv.partner_name}</strong>
                  {conv.unread_count > 0 && (
                    <span className="tp-nav-badge">{conv.unread_count}<span className="sr-only"> non lu(s)</span></span>
                  )}
                </span>
                <span className="tp-muted" style={{ display: 'block', fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.last_content}
                </span>
              </Link>
            ))
          )}
        </nav>

        {partnerId ? (
          <section className="tp-messages__thread" aria-labelledby="titre-fil">
            <Link to="/messages" className="tp-messages__back">← Toutes les conversations</Link>
            <h2 id="titre-fil" style={{ fontSize: 'var(--text-lg)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-white)' }}>
              {partnerName}
            </h2>
            <div className="tp-messages__scroll" role="log" aria-live="polite" aria-relevant="additions">
              {threadError && <p className="tp-alert tp-alert--error" role="alert">{threadError}</p>}
              {messages.length === 0 && !threadError && <p className="tp-muted tp-small">Écrivez votre premier message.</p>}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`tp-bubble ${isMe ? 'tp-bubble--me' : 'tp-bubble--them'}`}>
                    <span className="sr-only">{isMe ? 'Vous' : partnerName} : </span>
                    {msg.content}
                    <span style={{ fontSize: 11, opacity: 0.85, display: 'block', marginTop: 4 }}>
                      {formatDate(msg.sent_at, 'd MMM HH:mm')}
                    </span>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form className="tp-composer" onSubmit={handleSend}>
              <label htmlFor="nouveau-message" className="sr-only">Votre message à {partnerName}</label>
              <input
                id="nouveau-message"
                className="tp-input"
                value={newMessage}
                maxLength={MESSAGE_MAX_LENGTH}
                autoComplete="off"
                aria-invalid={sendError ? true : undefined}
                aria-describedby={sendError ? 'erreur-envoi' : undefined}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <Button type="submit" variant="primary" loading={sending} disabled={!newMessage.trim()}>Envoyer</Button>
            </form>
            {sendError && <p id="erreur-envoi" className="tp-alert tp-alert--error" role="alert" style={{ margin: '0 var(--space-4) var(--space-4)' }}>{sendError}</p>}
          </section>
        ) : (
          <div className="tp-messages__thread tp-muted" style={{ alignItems: 'center', justifyContent: 'center' }}>
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </MainLayout>
  )
}
