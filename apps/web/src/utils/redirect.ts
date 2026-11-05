import type { User } from '../services/auth.service'

/** État de navigation posé par les gardes de route : page demandée avant connexion. */
export interface RedirectState {
  from?: string
}

/** Page d'accueil selon le rôle : les producteurs arrivent sur leur tableau de bord. */
export const homeFor = (user: Pick<User, 'role'>) => (user.role === 'PRODUCER' ? '/producer/dashboard' : '/')

/** N'accepte qu'un chemin interne (pas de redirection ouverte vers un autre site). */
export function readRedirectTarget(state: unknown): string | null {
  const from = (state as RedirectState | null)?.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null
}
