import { useEffect, useState } from 'react'
import { EventList } from '../events/EventList'
import { eventsService, type ProducerEvent } from '../../services/events.service'
import { apiErrorMessage } from '../../services/api'
import type { GeoPosition } from '../../hooks/useGeolocation'

const EVENTS_RADIUS_KM = 50
const EVENTS_LIMIT = 4

/** PROD-6 — agenda de proximité : rendez-vous autour de la position, sinon les prochains de la plateforme. */
export function UpcomingEvents({ position }: { position: GeoPosition | null }) {
  const [events, setEvents] = useState<ProducerEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const lat = position?.lat
  const lon = position?.lon

  useEffect(() => {
    const query = lat !== undefined && lon !== undefined
      ? { lat, lon, radius: EVENTS_RADIUS_KM, limit: EVENTS_LIMIT }
      : { limit: EVENTS_LIMIT }
    setError(null)
    eventsService.list(query)
      .then(({ data }) => setEvents(data))
      .catch((err) => setError(apiErrorMessage(err, 'Agenda indisponible pour le moment')))
  }, [lat, lon])

  if (!error && events.length === 0 && !position) return null

  return (
    <section className="tp-section" aria-labelledby="titre-agenda">
      <h2 id="titre-agenda" className="tp-section-title">
        {position ? 'Prochains rendez-vous près de chez vous' : 'Prochains rendez-vous'}
      </h2>
      {error ? (
        <p className="tp-muted">{error}</p>
      ) : events.length === 0 ? (
        <p className="tp-muted">Aucun rendez-vous à moins de {EVENTS_RADIUS_KM} km pour le moment.</p>
      ) : (
        <EventList events={events} showProducer />
      )}
    </section>
  )
}
