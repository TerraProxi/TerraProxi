import { describe, expect, it } from 'vitest'
import { formatEventPeriod, formatPrice, fromDateTimeLocal, toDateTimeLocal } from './format'

/** Intl sépare les milliers et l'euro par des espaces insécables : on les normalise pour comparer. */
const plain = (text: string) => text.replace(/[  ]/g, ' ')

describe('format', () => {
  it('affiche les prix en euros à la française, y compris depuis une chaîne NUMERIC', () => {
    expect(plain(formatPrice(1234.5))).toBe('1 234,50 €')
    expect(plain(formatPrice('4.5'))).toBe('4,50 €')
  })

  it('convertit un datetime-local (heure de Paris) en ISO UTC et inversement', () => {
    expect(fromDateTimeLocal('2026-07-14T09:30')).toBe('2026-07-14T07:30:00.000Z')
    expect(fromDateTimeLocal('2026-12-05T18:00')).toBe('2026-12-05T17:00:00.000Z')
    expect(toDateTimeLocal('2026-07-14T07:30:00.000Z')).toBe('2026-07-14T09:30')
    expect(toDateTimeLocal(fromDateTimeLocal('2026-03-29T03:15'))).toBe('2026-03-29T03:15')
  })

  it('décrit la période d\'un rendez-vous sur un ou plusieurs jours', () => {
    expect(formatEventPeriod('2026-07-14T07:00:00Z', '2026-07-14T11:00:00Z')).toBe('mardi 14 juillet 2026, 09:00 – 13:00')
    expect(formatEventPeriod('2026-07-14T07:00:00Z', null)).toBe('mardi 14 juillet 2026, 09:00')
    expect(formatEventPeriod('2026-07-14T07:00:00Z', '2026-07-15T16:00:00Z'))
      .toBe('mardi 14 juillet 2026, 09:00 → mercredi 15 juillet 2026, 18:00')
  })
})
