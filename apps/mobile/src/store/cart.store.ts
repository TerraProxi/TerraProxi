import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name) ?? null,
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}

export interface CartProduct {
  id: string
  name: string
  price: number
  unit: string
  producer_id: string
  image_url?: string
}

export interface CartItem {
  product: CartProduct
  quantity: number
}

export type CartAddResult = 'added' | 'updated' | 'conflict'

const computeCartStats = (items: CartItem[]) => ({
  total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  count: items.reduce((sum, item) => sum + item.quantity, 0),
})

interface CartStore {
  items: CartItem[]
  producerId: string | null
  total: number
  count: number
  add: (product: CartProduct, quantity?: number) => CartAddResult
  replaceWith: (product: CartProduct, quantity?: number) => void
  remove: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      producerId: null,
      total: 0,
      count: 0,

      add: (product, quantity = 1) => {
        const state = get()
        if (state.producerId && state.producerId !== product.producer_id) {
          return 'conflict'
        }

        const existing = state.items.find((i) => i.product.id === product.id)
        if (existing) {
          const nextItems = state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
          )
          set({
            items: nextItems,
            ...computeCartStats(nextItems),
          })
          return 'updated'
        }

        const nextItems = [...state.items, { product, quantity }]
        set({
          items: nextItems,
          producerId: product.producer_id,
          ...computeCartStats(nextItems),
        })
        return 'added'
      },

      replaceWith: (product, quantity = 1) => {
        const nextItems = [{ product, quantity }]
        set({
          items: nextItems,
          producerId: product.producer_id,
          ...computeCartStats(nextItems),
        })
      },

      remove: (productId) => set((s) => {
        const nextItems = s.items.filter((i) => i.product.id !== productId)
        return {
          items: nextItems,
          producerId: nextItems.length === 0 ? null : s.producerId,
          ...computeCartStats(nextItems),
        }
      }),

      updateQty: (productId, quantity) => set((s) => {
        const nextItems = s.items.map((i) =>
          i.product.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i,
        )
        return {
          items: nextItems,
          ...computeCartStats(nextItems),
        }
      }),

      clear: () => set({ items: [], producerId: null, total: 0, count: 0 }),
    }),
    {
      name: 'cart-store',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ items: state.items, producerId: state.producerId }),
      merge: (persistedState, currentState) => {
        const nextState = {
          ...currentState,
          ...(persistedState as Partial<CartStore>),
        }
        return {
          ...nextState,
          ...computeCartStats(nextState.items ?? []),
        }
      },
    },
  ),
)
