import { beforeEach, describe, expect, test } from 'bun:test'
import { hasTestDatabase } from '../setup'
import { call, registerAccount, resetDatabase } from './helpers'

describe.skipIf(!hasTestDatabase)('Auth (specs/features/auth.feature)', () => {
  beforeEach(resetDatabase)

  test('inscription → 201 avec jetons, sans hash de mot de passe', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: { email: 'Alice@Test.fr', password: 'motdepasse1', first_name: 'Alice', last_name: 'L', gdpr_consent: true },
    })
    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('alice@test.fr')
    expect(res.body.user.role).toBe('CONSUMER')
    expect(res.body.user.password_hash).toBeUndefined()
    expect(res.body.access_token).toBeString()
    expect(res.body.refresh_token).toBeString()
  })

  test('inscription sans consentement RGPD → 400', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: { email: 'b@test.fr', password: 'motdepasse1', first_name: 'B', last_name: 'B', gdpr_consent: false },
    })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ status: 400, error: expect.any(String) })
  })

  test('email déjà utilisé → 409', async () => {
    const account = await registerAccount()
    const res = await call('POST', '/api/auth/register', {
      body: { email: account.email, password: 'motdepasse1', first_name: 'X', last_name: 'Y', gdpr_consent: true },
    })
    expect(res.status).toBe(409)
  })

  test('mot de passe trop court → 400 avec le champ en détail', async () => {
    const res = await call('POST', '/api/auth/register', {
      body: { email: 'c@test.fr', password: 'court', first_name: 'C', last_name: 'C', gdpr_consent: true },
    })
    expect(res.status).toBe(400)
    expect(res.body.details.field).toBe('password')
  })

  test('connexion avec le bon et le mauvais mot de passe', async () => {
    const account = await registerAccount()
    const ok = await call('POST', '/api/auth/login', { body: { email: account.email, password: account.password } })
    expect(ok.status).toBe(200)
    expect(ok.body.user.id).toBe(account.id)

    const ko = await call('POST', '/api/auth/login', { body: { email: account.email, password: 'mauvais-mdp' } })
    expect(ko.status).toBe(401)
  })

  test('route protégée : 401 sans jeton, 401 jeton invalide, 200 jeton valide', async () => {
    const account = await registerAccount()
    expect((await call('GET', '/api/users/profile')).status).toBe(401)
    expect((await call('GET', '/api/users/profile', { token: 'abc.def.ghi' })).status).toBe(401)
    const me = await call('GET', '/api/auth/me', { token: account.token })
    expect(me.status).toBe(200)
    expect(me.body.email).toBe(account.email)
  })

  test('rôle insuffisant → 403 (consommateur sur une route producteur)', async () => {
    const consumer = await registerAccount('CONSUMER')
    const res = await call('POST', '/api/products', {
      token: consumer.token,
      body: { name: 'X', price: 1, stock: 1 },
    })
    expect(res.status).toBe(403)
  })

  test('refresh token : usage unique puis rejet ; logout le révoque', async () => {
    const account = await registerAccount()
    const first = await call('POST', '/api/auth/refresh', { body: { refresh_token: account.refreshToken } })
    expect(first.status).toBe(200)
    expect(first.body.refresh_token).not.toBe(account.refreshToken)

    const replay = await call('POST', '/api/auth/refresh', { body: { refresh_token: account.refreshToken } })
    expect(replay.status).toBe(401)

    const logout = await call('POST', '/api/auth/logout', { body: { refresh_token: first.body.refresh_token } })
    expect(logout.status).toBe(204)
    const afterLogout = await call('POST', '/api/auth/refresh', { body: { refresh_token: first.body.refresh_token } })
    expect(afterLogout.status).toBe(401)
  })

  test('changement de mot de passe : ancien refusé, sessions révoquées', async () => {
    const account = await registerAccount()
    const wrong = await call('PUT', '/api/users/me/password', {
      token: account.token, body: { current_password: 'faux', new_password: 'nouveau-mdp-1' },
    })
    expect(wrong.status).toBe(403)

    const ok = await call('PUT', '/api/users/me/password', {
      token: account.token, body: { current_password: account.password, new_password: 'nouveau-mdp-1' },
    })
    expect(ok.status).toBe(204)
    expect((await call('POST', '/api/auth/login', { body: { email: account.email, password: account.password } })).status).toBe(401)
    expect((await call('POST', '/api/auth/login', { body: { email: account.email, password: 'nouveau-mdp-1' } })).status).toBe(200)
    expect((await call('POST', '/api/auth/refresh', { body: { refresh_token: account.refreshToken } })).status).toBe(401)
  })

  test('/health signale la base comme disponible', async () => {
    const res = await call('GET', '/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' })
  })
})
