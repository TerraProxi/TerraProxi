import type { User } from '../services/auth.service'

/** État de navigation posé par les gardes de route : page demandée avant connexion. */
export interface RedirectState {
  from?: string
}

const ROLE_HOMES: Readonly<Record<User['role'], string>> = {
  CONSUMER: '/',
  PRODUCER: '/producer/dashboard',
  ADMIN: '/admin',
}

/** Page d'accueil selon le rôle : tableau de bord pour les producteurs, back-office pour les administrateurs. */
export const homeFor = (user: Pick<User, 'role'>) => ROLE_HOMES[user.role]

/** N'accepte qu'un chemin interne (pas de redirection ouverte vers un autre site). */
export function readRedirectTarget(state: unknown): string | null {
  const from = (state as RedirectState | null)?.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null
}
