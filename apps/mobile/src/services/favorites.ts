import api, { apiErrorStatus } from './api'

const HTTP_NOT_FOUND = 404

/**
 * Charge chaque favori par son identifiant (GET {path}/{id}). Un favori supprimé côté
 * serveur (404) est oublié via `forget` ; les autres erreurs remontent pour afficher un message.
 */
export async function fetchFavoritesByIds<T>(ids: string[], path: string, forget: (id: string) => void): Promise<T[]> {
  const results = await Promise.allSettled(ids.map((id) => api.get<T>(`${path}/${id}`)))
  const items: T[] = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') items.push(result.value.data)
    else if (apiErrorStatus(result.reason) === HTTP_NOT_FOUND) forget(ids[index])
    else throw result.reason
  })
  return items
}
