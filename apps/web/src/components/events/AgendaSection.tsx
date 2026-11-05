import { Button } from '../ui/Button'
import type { ProducerEvent } from '../../services/events.service'
import { formatEventPeriod } from '../../utils/format'

interface SectionProps {
  title: string
  events: ProducerEvent[]
  emptyText: string
  onEdit: (event: ProducerEvent) => void
  onDelete: (event: ProducerEvent) => void
}

/** Liste éditable des rendez-vous du producteur (à venir ou passés). */
export function AgendaSection({ title, events, emptyText, onEdit, onDelete }: SectionProps) {
  return (
    <section className="tp-section" aria-label={`Rendez-vous ${title.toLowerCase()}`}>
      <h2 className="tp-section-title" style={{ fontSize: 'var(--text-xl)' }}>{title}</h2>
      {events.length === 0 ? (
        <p className="tp-muted">{emptyText}</p>
      ) : (
        <ul className="tp-event-list">
          {events.map((event) => (
            <li key={event.id} className="tp-event">
              <p className="tp-event__date"><time dateTime={event.starts_at}>{formatEventPeriod(event.starts_at, event.ends_at)}</time></p>
              <h3 className="tp-event__title">{event.title}</h3>
              {event.location && <p className="tp-small"><span aria-hidden="true">📍 </span>{event.location}</p>}
              <div className="tp-cluster" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
                <Button size="sm" variant="primary" onClick={() => onEdit(event)}>
                  Modifier<span className="sr-only"> {event.title}</span>
                </Button>
                <Button size="sm" variant="danger-ghost" onClick={() => onDelete(event)}>
                  Supprimer<span className="sr-only"> {event.title}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
