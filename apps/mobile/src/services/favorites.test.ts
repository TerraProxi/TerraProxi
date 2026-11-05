import { fetchFavoritesByIds } from './favorites'
import { fakeNetwork, pathOf } from '../test/http'

describe('chargement des favoris par identifiant', () => {
  it('oublie un favori supprimé côté serveur (404) et renvoie les autres', async () => {
    fakeNetwork((config) => (pathOf(config) === '/products/disparu'
      ? { status: 404, data: { error: 'Produit introuvable' } }
      : { status: 200, data: { id: pathOf(config).split('/').pop() } }))
    const forget = jest.fn()

    const items = await fetchFavoritesByIds<{ id: string }>(['miel', 'disparu', 'pain'], '/products', forget)

    expect(items.map((i) => i.id)).toEqual(['miel', 'pain'])
    expect(forget).toHaveBeenCalledTimes(1)
    expect(forget).toHaveBeenCalledWith('disparu')
  })

  it("remonte les autres erreurs sans rien oublier", async () => {
    fakeNetwork(() => ({ status: 500, data: { error: 'Erreur interne' } }))
    const forget = jest.fn()

    await expect(fetchFavoritesByIds(['miel'], '/products', forget)).rejects.toThrow('HTTP 500')
    expect(forget).not.toHaveBeenCalled()
  })
})
