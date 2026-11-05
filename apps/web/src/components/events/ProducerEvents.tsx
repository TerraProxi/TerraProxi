import { useEffect, useState } from 'react'
import { EventList } from './EventList'
import { eventsService, type ProducerEvent } from '../../services/events.service'
import { apiErrorMessage } from '../../services/api'

/** « Prochains rendez-vous » d'une fiche producteur ; la section disparaît s'il n'y en a aucun. */
export function ProducerEvents({ producerId }: { producerId: string }) {
  const [events, setEvents] = useState<ProducerEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    eventsService.list({ producer_id: producerId })
      .then(({ data }) => setEvents(data))
      .catch((err) => setError(apiErrorMessage(err, 'Agenda indisponible pour le moment')))
  }, [producerId])

  if (!error && events.length === 0) return null

  return (
    <section className="tp-section" aria-labelledby="titre-rendez-vous" style={{ marginTop: 'var(--space-8)' }}>
      <h2 id="titre-rendez-vous" className="tp-section-title">Prochains rendez-vous</h2>
      {error ? <p className="tp-muted">{error}</p> : <EventList events={events} />}
    </section>
  )
}
