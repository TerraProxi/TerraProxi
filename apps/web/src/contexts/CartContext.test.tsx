import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CartProvider, useCart, type CartProduct } from './CartContext'

const STORAGE_KEY = 'terraproxi.cart.v1'

const tomatoes: CartProduct = { id: 'p-tomates', producer_id: 'ferme-a', producer_name: 'Ferme A', name: 'Tomates', price: 4.5, unit: 'kg' }
const apples: CartProduct = { id: 'p-pommes', producer_id: 'ferme-a', producer_name: 'Ferme A', name: 'Pommes', price: 2, unit: 'kg' }
const cheese: CartProduct = { id: 'p-fromage', producer_id: 'ferme-b', producer_name: 'Ferme B', name: 'Pélardon', price: 3.2, unit: 'pièce' }

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>
const renderCart = () => renderHook(() => useCart(), { wrapper })

describe('CartContext', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('cumule les quantités d\'un même produit et les borne entre 1 et 999', () => {
    const { result } = renderCart()
    act(() => {
      result.current.add(tomatoes, 2)
      result.current.add(tomatoes, 3)
    })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.count).toBe(5)

    act(() => result.current.updateQty(tomatoes.id, 5000))
    expect(result.current.items[0].quantity).toBe(999)
    act(() => result.current.updateQty(tomatoes.id, 0))
    expect(result.current.items[0].quantity).toBe(1)
  })

  it('regroupe les produits par producteur au lieu de vider le panier', () => {
    const { result } = renderCart()
    act(() => {
      result.current.add(tomatoes, 2)
      result.current.add(apples, 1)
      result.current.add(cheese, 3)
    })
    const [farmA, farmB] = result.current.groups
    expect([farmA.producerName, farmA.items.length, farmB.producerName, farmB.items.length]).toEqual(['Ferme A', 2, 'Ferme B', 1])
    expect(farmA.subtotal).toBeCloseTo(11)
    expect(farmB.subtotal).toBeCloseTo(9.6)
    expect(result.current.total).toBeCloseTo(20.6)
    expect(result.current.count).toBe(6)
  })

  it('retire un producteur sans toucher aux autres', () => {
    const { result } = renderCart()
    act(() => {
      result.current.add(tomatoes)
      result.current.add(cheese)
    })
    act(() => result.current.removeProducer('ferme-a'))
    expect(result.current.groups.map((g) => g.producerId)).toEqual(['ferme-b'])
  })

  it('persiste le panier dans localStorage et le restaure au rechargement', () => {
    const first = renderCart()
    act(() => first.result.current.add(cheese, 2))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([{ product: cheese, quantity: 2 }])
    first.unmount()

    const second = renderCart()
    expect(second.result.current.count).toBe(2)
    expect(second.result.current.items[0].product.name).toBe('Pélardon')
  })

  it('ignore un contenu stocké corrompu ou mal formé', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ product: { id: 'x' }, quantity: 1 }, { product: tomatoes, quantity: 2 }]))
    expect(renderCart().result.current.items).toEqual([{ product: tomatoes, quantity: 2 }])

    localStorage.setItem(STORAGE_KEY, '{pas du json')
    expect(renderCart().result.current.items).toEqual([])
  })

  it('reste utilisable en mémoire quand localStorage lève une exception', () => {
    const storage = Object.getPrototypeOf(localStorage) as Storage
    vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new DOMException('bloqué', 'SecurityError') })
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new DOMException('plein', 'QuotaExceededError') })

    const { result } = renderCart()
    act(() => result.current.add(apples, 4))
    expect(result.current.count).toBe(4)
  })
})
