import { Link } from 'react-router-dom'
import type { ProducerEvent } from '../../services/events.service'
import { formatEventPeriod } from '../../utils/format'

interface Props {
  events: ProducerEvent[]
  /** Affiche le producteur (agenda de proximité) ; inutile sur sa propre fiche. */
  showProducer?: boolean
}

/** PROD-6 — rendez-vous publics d'un ou plusieurs producteurs. */
export function EventList({ events, showProducer = false }: Props) {
  return (
    <ul className="tp-event-list">
      {events.map((event) => (
        <li key={event.id} className="tp-event">
          <p className="tp-event__date">
            <span aria-hidden="true">📅 </span>
            <time dateTime={event.starts_at}>{formatEventPeriod(event.starts_at, event.ends_at)}</time>
          </p>
          <h3 className="tp-event__title">{event.title}</h3>
          {showProducer && (
            <p className="tp-small">
              <Link to={`/producers/${event.producer_id}`}>{event.producer_name}</Link>
              {event.producer_city && <span className="tp-muted"> — {event.producer_city}</span>}
            </p>
          )}
          {event.location && <p className="tp-small"><span aria-hidden="true">📍 </span>{event.location}</p>}
          {event.description && <p className="tp-small tp-muted" style={{ whiteSpace: 'pre-line' }}>{event.description}</p>}
        </li>
      ))}
    </ul>
  )
}
