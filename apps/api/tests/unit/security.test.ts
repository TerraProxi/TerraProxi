import { afterEach, describe, expect, test } from 'bun:test'
import { RateLimiter, RateLimitError } from '../../src/utils/rate-limit'
import { jwtSecret } from '../../src/middlewares/auth.middleware'
import { detectImageType } from '../../src/services/upload-storage'
import { HTTP_URL_PATTERN, emptyToNull } from '../../src/utils/validation'

describe('RateLimiter', () => {
  test('bloque au-delà du maximum puis repart à zéro après la fenêtre', () => {
    const limiter = new RateLimiter(2, 1000, 'trop')
    limiter.hit('k', 0)
    limiter.hit('k', 10)
    expect(() => limiter.hit('k', 20)).toThrow(RateLimitError)
    expect(() => limiter.assertAllowed('k', 20)).toThrow(RateLimitError)
    expect(() => limiter.hit('k', 1001)).not.toThrow()
  })

  test('Retry-After = secondes restantes dans la fenêtre', () => {
    const limiter = new RateLimiter(1, 60_000, 'trop')
    limiter.hit('k', 0)
    try {
      limiter.hit('k', 15_000)
      throw new Error('aurait dû être bloqué')
    } catch (err) {
      expect((err as RateLimitError).retryAfterSeconds).toBe(45)
      expect((err as RateLimitError).statusCode).toBe(429)
    }
  })

  test('clés indépendantes, reset et prune', () => {
    const limiter = new RateLimiter(1, 1000, 'trop')
    limiter.hit('a', 0)
    expect(() => limiter.hit('b', 0)).not.toThrow()
    limiter.reset('a')
    expect(() => limiter.hit('a', 0)).not.toThrow()
    limiter.prune(5000)
    expect(() => limiter.hit('a', 5000)).not.toThrow()
  })
})

describe('JWT_SECRET', () => {
  const saved = { secret: process.env.JWT_SECRET, env: process.env.NODE_ENV }
  afterEach(() => {
    process.env.JWT_SECRET = saved.secret
    process.env.NODE_ENV = saved.env
  })

  test('en production, un secret court ou d\'exemple empêche le démarrage', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'CHANGE_ME_AT_LEAST_32_CHARS_RANDOM_STRING'
    expect(() => jwtSecret()).toThrow(/JWT_SECRET trop faible/)
    process.env.JWT_SECRET = 'court'
    expect(() => jwtSecret()).toThrow(/JWT_SECRET trop faible/)
    process.env.JWT_SECRET = 'x'.repeat(48)
    expect(jwtSecret()).toHaveLength(48)
  })
})

describe('Validation des entrées', () => {
  const url = new RegExp(HTTP_URL_PATTERN)

  test('URL : http(s) seulement, chaîne vide tolérée', () => {
    expect(url.test('https://exemple.fr/photo.jpg')).toBe(true)
    expect(url.test('')).toBe(true)
    expect(url.test('javascript:alert(1)')).toBe(false)
    expect(url.test('data:image/png;base64,AAAA')).toBe(false)
    expect(url.test('https://exemple.fr/"onerror="x')).toBe(false)
    expect(emptyToNull('  ')).toBeNull()
  })

  test('type d\'image déduit des premiers octets', () => {
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.extension).toBe('jpg')
    const webp = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')
    expect(detectImageType(webp)?.contentType).toBe('image/webp')
    expect(detectImageType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
  })
})
