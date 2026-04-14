import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Product } from '../services/products.service'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartState {
  items: CartItem[]
  producerId: string | null
}

type CartAction =
  | { type: 'ADD'; product: Product; quantity?: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'UPDATE_QTY'; productId: string; quantity: number }
  | { type: 'CLEAR' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      // Un panier ne peut contenir des produits que d'un seul producteur
      if (state.producerId && state.producerId !== action.product.producer_id) {
        // Nouveau producteur → vider et recommencer
        return {
          producerId: action.product.producer_id,
          items: [{ product: action.product, quantity: action.quantity ?? 1 }],
        }
      }
      const existing = state.items.find((i) => i.product.id === action.product.id)
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + (action.quantity ?? 1) }
              : i,
          ),
        }
      }
      return {
        producerId: action.product.producer_id,
        items: [...state.items, { product: action.product, quantity: action.quantity ?? 1 }],
      }
    }
    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter((i) => i.product.id !== action.productId),
        producerId: state.items.length === 1 ? null : state.producerId,
      }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? { ...i, quantity: Math.max(1, action.quantity) }
            : i,
        ),
      }
    case 'CLEAR':
      return { items: [], producerId: null }
    default:
      return state
  }
}

interface CartContextValue {
  items: CartItem[]
  producerId: string | null
  total: number
  count: number
  add: (product: Product, quantity?: number) => void
  remove: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], producerId: null })

  const total = state.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  )
  const count = state.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        ...state,
        total,
        count,
        add: (product, quantity) => dispatch({ type: 'ADD', product, quantity }),
        remove: (productId) => dispatch({ type: 'REMOVE', productId }),
        updateQty: (productId, quantity) => dispatch({ type: 'UPDATE_QTY', productId, quantity }),
        clear: () => dispatch({ type: 'CLEAR' }),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
