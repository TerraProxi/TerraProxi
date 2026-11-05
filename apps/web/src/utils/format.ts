import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** Les montants arrivent parfois en chaîne (colonnes NUMERIC PostgreSQL). */
export const formatPrice = (value: number | string) => priceFormatter.format(Number(value))

export const formatDate = (iso: string, pattern = 'd MMMM yyyy') => format(new Date(iso), pattern, { locale: fr })

export const formatDateTime = (iso: string) => formatDate(iso, "d MMM yyyy 'à' HH:mm")

/** Valeur d'un <input type="datetime-local"> (heure locale) à partir d'une date ISO. */
export const toDateTimeLocal = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")

/** Date ISO 8601 (UTC) à partir d'un <input type="datetime-local">, interprété en heure locale. */
export const fromDateTimeLocal = (value: string) => new Date(value).toISOString()

const EVENT_DATE_PATTERN = "EEEE d MMMM yyyy, HH:mm"

/** « samedi 12 avril 2026, 09:00 – 13:00 », ou deux dates complètes si l'événement dure plusieurs jours. */
export function formatEventPeriod(startsAt: string, endsAt: string | null): string {
  const startLabel = formatDate(startsAt, EVENT_DATE_PATTERN)
  if (!endsAt) return startLabel
  const isSameDay = new Date(startsAt).toDateString() === new Date(endsAt).toDateString()
  return isSameDay
    ? `${startLabel} – ${formatDate(endsAt, 'HH:mm')}`
    : `${startLabel} → ${formatDate(endsAt, EVENT_DATE_PATTERN)}`
}
