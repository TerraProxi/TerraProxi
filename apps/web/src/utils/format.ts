import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** Les montants arrivent parfois en chaîne (colonnes NUMERIC PostgreSQL). */
export const formatPrice = (value: number | string) => priceFormatter.format(Number(value))

export const formatDate = (iso: string, pattern = 'd MMMM yyyy') => format(new Date(iso), pattern, { locale: fr })

export const formatDateTime = (iso: string) => formatDate(iso, "d MMM yyyy 'à' HH:mm")
