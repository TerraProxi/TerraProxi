import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { apiErrorMessage, apiErrorStatus, retryAfterSeconds } from './api'

/** Erreur axios telle que la produit une réponse de l'API (enveloppe {error, status}). */
function httpError(status: number, data: unknown, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() }
  const response = { status, statusText: '', data, headers, config } as AxiosResponse
  return new AxiosError('échec', AxiosError.ERR_BAD_RESPONSE, config, null, response)
}

describe('apiErrorMessage', () => {
  it('reprend le message de l\'API et ajoute le délai Retry-After d\'un 429', () => {
    const err = httpError(429, { error: 'Trop de tentatives de connexion', status: 429 }, { 'retry-after': '840' })
    expect(apiErrorMessage(err)).toBe('Trop de tentatives de connexion Réessayez dans 14 min.')
    expect(retryAfterSeconds(err)).toBe(840)
  })

  it('exprime en secondes un délai inférieur à une minute', () => {
    expect(apiErrorMessage(httpError(429, {}, { 'retry-after': '45' }))).toBe('Trop de tentatives. Réessayez dans 45 s.')
  })

  it('ignore un Retry-After absent ou invalide', () => {
    const err = httpError(429, { error: 'Quota IA atteint' }, { 'retry-after': 'bientôt' })
    expect(retryAfterSeconds(err)).toBeNull()
    expect(apiErrorMessage(err)).toBe('Quota IA atteint')
  })

  it('distingue serveur injoignable, délai dépassé et erreur inconnue', () => {
    expect(apiErrorMessage(new AxiosError('Network Error', AxiosError.ERR_NETWORK))).toBe('Serveur injoignable, vérifiez votre connexion')
    expect(apiErrorMessage(new AxiosError('timeout', AxiosError.ECONNABORTED))).toMatch(/trop de temps/)
    expect(apiErrorMessage(new Error('boom'), 'Repli')).toBe('Repli')
    expect(apiErrorStatus(httpError(404, {}))).toBe(404)
    expect(apiErrorStatus(new Error('boom'))).toBeUndefined()
  })
})
