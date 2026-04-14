import { create } from 'zustand'

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

interface CartStore {
  items: CartItem[]
  producerId: string | null
  total: number
  count: number
  add: (product: CartProduct, quantity?: number) => void
  remove: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  producerId: null,
  get total() { return get().items.reduce((s, i) => s + i.product.price * i.quantity, 0) },
  get count() { return get().items.reduce((s, i) => s + i.quantity, 0) },

  add: (product, quantity = 1) => {
    set((state) => {
      if (state.producerId && state.producerId !== product.producer_id) {
        return { items: [{ product, quantity }], producerId: product.producer_id }
      }
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
          ),
        }
      }
      return {
        items: [...state.items, { product, quantity }],
        producerId: product.producer_id,
      }
    })
  },

  remove: (productId) => set((s) => ({
    items: s.items.filter((i) => i.product.id !== productId),
    producerId: s.items.length === 1 ? null : s.producerId,
  })),

  updateQty: (productId, quantity) => set((s) => ({
    items: s.items.map((i) =>
      i.product.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i,
    ),
  })),

  clear: () => set({ items: [], producerId: null }),
}))
