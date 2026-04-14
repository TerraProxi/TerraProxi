import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { messagesService, type Conversation, type Message } from '../../services/messages.service'
import { useAuth } from '../../contexts/AuthContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function MessagesPage() {
  const { partnerId } = useParams<{ partnerId?: string }>()
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [activePartner, setActivePartner] = useState<string | null>(partnerId ?? null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesService.conversations().then(({ data }) => setConversations(data))
  }, [])

  useEffect(() => {
    if (!activePartner) return
    messagesService.thread(activePartner).then(({ data }) => {
      setMessages(data)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
  }, [activePartner])

  const handleSend = async () => {
    if (!activePartner || !newMessage.trim()) return
    setSending(true)
    try {
      const { data } = await messagesService.send(activePartner, newMessage.trim())
      setMessages((m) => [...m, data])
      setNewMessage('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } finally {
      setSending(false)
    }
  }

  return (
    <MainLayout fullWidth>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100vh - 65px)' }}>
        {/* Conversations */}
        <aside style={{ background: 'var(--color-white)', borderRight: '1px solid var(--color-border)', overflowY: 'auto' }}>
          <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)' }}>💬 Messages</h2>
          </div>
          {conversations.length === 0 ? (
            <p style={{ padding: 'var(--space-5)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Aucune conversation.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.partner_id}
                onClick={() => setActivePartner(conv.partner_id)}
                style={{
                  width: '100%',
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: '1px solid var(--color-border)',
                  background: activePartner === conv.partner_id ? '#EBF8F0' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-sm)' }}>
                    {conv.partner_name}
                  </strong>
                  {conv.unread_count > 0 && (
                    <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.last_content}
                </p>
              </button>
            ))
          )}
        </aside>

        {/* Thread */}
        {activePartner ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        maxWidth: '65%',
                        background: isMe ? 'var(--color-primary)' : 'var(--color-white)',
                        color: isMe ? '#fff' : 'var(--color-dark)',
                        border: isMe ? 'none' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-3) var(--space-4)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      <p>{msg.content}</p>
                      <span style={{ fontSize: 10, opacity: 0.7, display: 'block', marginTop: 4 }}>
                        {format(new Date(msg.sent_at), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Votre message…"
                style={{ flex: 1, padding: '0.625rem 0.875rem', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)' }}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0 1.25rem', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
              >
                Envoyer
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </MainLayout>
  )
}
