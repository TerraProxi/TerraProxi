import { describe, expect, test } from 'bun:test'
import { hashToken, parseDuration } from '../../src/utils/tokens'

const DAY = 24 * 3600 * 1000

describe('parseDuration', () => {
  test.each([
    ['7d', 7 * DAY],
    ['12h', 12 * 3600 * 1000],
    ['30m', 30 * 60 * 1000],
    [' 2d ', 2 * DAY],
  ])('%p → %p ms', (input, expected) => {
    expect(parseDuration(input)).toBe(expected)
  })

  test.each([undefined, '', 'demain', '7 jours', '-1d'])('valeur invalide %p → 7 jours', (input) => {
    expect(parseDuration(input)).toBe(7 * DAY)
  })
})

describe('hashToken', () => {
  test('est déterministe et ne contient pas le jeton', () => {
    const token = 'secret-refresh-token'
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).not.toContain(token)
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/)
  })
})
