import { describe, expect, test } from 'bun:test'
import { canTransition, shouldRestock } from '../../src/services/order-status'
import type { OrderStatus } from '../../src/models/types'

const ALL: OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']

describe('cycle de vie des commandes — producteur', () => {
  test.each([
    ['PAID', 'PREPARING'],
    ['PREPARING', 'READY'],
    ['READY', 'COMPLETED'],
    ['PENDING', 'CANCELLED'],
    ['PAID', 'CANCELLED'],
    ['PREPARING', 'CANCELLED'],
  ] as const)('autorise %s → %s', (from, to) => {
    expect(canTransition('PRODUCER', from, to)).toBe(true)
  })

  test.each([
    ['PENDING', 'PAID'],
    ['PENDING', 'PREPARING'],
    ['PENDING', 'COMPLETED'],
    ['READY', 'CANCELLED'],
    ['COMPLETED', 'PREPARING'],
    ['CANCELLED', 'PREPARING'],
  ] as const)('refuse %s → %s', (from, to) => {
    expect(canTransition('PRODUCER', from, to)).toBe(false)
  })
})

describe('cycle de vie des commandes — consommateur', () => {
  test('peut annuler une commande non payée', () => {
    expect(canTransition('CONSUMER', 'PENDING', 'CANCELLED')).toBe(true)
  })

  test('ne peut faire aucune autre transition', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        if (from === 'PENDING' && to === 'CANCELLED') continue
        expect(canTransition('CONSUMER', from, to)).toBe(false)
      }
    }
  })
})

describe('remise en stock', () => {
  test('uniquement à l\'annulation', () => {
    expect(ALL.filter(shouldRestock)).toEqual(['CANCELLED'])
  })
})

describe('états terminaux', () => {
  test.each(['COMPLETED', 'CANCELLED'] as const)('%s ne mène nulle part', (from) => {
    for (const to of ALL) expect(canTransition('PRODUCER', from, to)).toBe(false)
  })
})
