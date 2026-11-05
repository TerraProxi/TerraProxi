import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCartStore, type CartProduct } from './cart.store'
import { placeOrdersByProducer } from '../services/orders'
import { apiError } from '../test/http'

const tomates: CartProduct = { id: 'p-tomates', name: 'Tomates', price: 3.5, unit: 'kg', producer_id: 'prod-a', producer_name: 'Ferme A' }
const salade: CartProduct = { id: 'p-salade', name: 'Salade', price: 1.2, unit: 'pièce', producer_id: 'prod-a', producer_name: 'Ferme A' }
const miel: CartProduct = { id: 'p-miel', name: 'Miel', price: 8, unit: 'pot', producer_id: 'prod-b', producer_name: 'Rucher B' }

beforeEach(async () => {
  useCartStore.getState().clear()
  await AsyncStorage.clear()
})

describe('panier', () => {
  it('cumule la quantité quand on ajoute deux fois le même produit', () => {
    const { add } = useCartStore.getState()
    expect(add(tomates)).toBe('added')
    expect(add(tomates, 2)).toBe('updated')

    const { items, count, total } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(3)
    expect(count).toBe(3)
    expect(total).toBeCloseTo(10.5)
  })

  it('regroupe les articles par producteur', () => {
    const { add } = useCartStore.getState()
    add(tomates)
    add(salade)
    add(miel)

    const { groups } = useCartStore.getState()
    expect(groups.map((g) => g.producerId)).toEqual(['prod-a', 'prod-b'])
    expect(groups[0].items).toHaveLength(2)
    expect(groups[1].producerName).toBe('Rucher B')
  })

  it('garde une quantité minimale de 1 et retire le producteur sans article', () => {
    const { add, updateQty, remove } = useCartStore.getState()
    add(miel)
    updateQty('p-miel', 0)
    expect(useCartStore.getState().items[0].quantity).toBe(1)

    remove('p-miel')
    expect(useCartStore.getState().groups).toHaveLength(0)
    expect(useCartStore.getState().count).toBe(0)
  })

  it('après un échec partiel, ne garde que les articles du producteur refusé', async () => {
    const { add, removeProducer } = useCartStore.getState()
    add(tomates)
    add(miel)
    const createOrder = jest.fn(async (group: { producerId: string }) => {
      if (group.producerId === 'prod-b') throw apiError(400, { error: 'Stock insuffisant pour Miel' })
      return 'order-a'
    })

    const outcome = await placeOrdersByProducer(useCartStore.getState().groups, createOrder, removeProducer)

    expect(outcome.orderIds).toEqual(['order-a'])
    expect(outcome.failures).toEqual(['• Rucher B : Stock insuffisant pour Miel'])
    expect(useCartStore.getState().groups.map((g) => g.producerId)).toEqual(['prod-b'])
  })
})

describe('persistance du panier', () => {
  it('enregistre les groupes dans AsyncStorage et les restaure avec les totaux', async () => {
    useCartStore.getState().add(tomates, 2)
    // L'écriture du middleware persist est asynchrone
    await new Promise((resolve) => setImmediate(resolve))
    const saved = JSON.parse((await AsyncStorage.getItem('cart-store-v2')) ?? '{}')
    expect(saved.state.groups[0].items[0]).toMatchObject({ quantity: 2, product: { id: 'p-tomates' } })

    // Nouveau lancement : état vide en mémoire, données enregistrées sur le téléphone
    useCartStore.setState({ groups: [], items: [], total: 0, count: 0 })
    await AsyncStorage.setItem('cart-store-v2', JSON.stringify(saved))
    await useCartStore.persist.rehydrate()
    expect(useCartStore.getState().count).toBe(2)
    expect(useCartStore.getState().total).toBeCloseTo(7)
  })
})
