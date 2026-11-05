import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'

/** Ce que le panier retient d'un produit : de quoi l'afficher et le commander. */
export interface CartProduct {
  id: string
  producer_id: string
  producer_name?: string
  name: string
  price: number
  unit: string
  image_url?: string | null
}

export interface CartItem {
  product: CartProduct
  quantity: number
}

/** Un groupe = un producteur = une commande (specs/schemas/cart.schema.json). */
export interface CartGroup {
  producerId: string
  producerName: string
  items: CartItem[]
  subtotal: number
}

const STORAGE_KEY = 'terraproxi.cart.v1'
const MAX_QUANTITY = 999
const DEFAULT_PRODUCER_NAME = 'Producteur local'

type CartAction =
  | { type: 'ADD'; product: CartProduct; quantity: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'REMOVE_PRODUCER'; producerId: string }
  | { type: 'UPDATE_QTY'; productId: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'REPLACE'; items: CartItem[] }

const clampQuantity = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity)))

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const existing = items.find((i) => i.product.id === action.product.id)
      if (!existing) return [...items, { product: action.product, quantity: clampQuantity(action.quantity) }]
      return items.map((i) =>
        i === existing ? { ...i, quantity: clampQuantity(i.quantity + action.quantity) } : i,
      )
    }
    case 'REMOVE':
      return items.filter((i) => i.product.id !== action.productId)
    case 'REMOVE_PRODUCER':
      return items.filter((i) => i.product.producer_id !== action.producerId)
    case 'UPDATE_QTY':
      return items.map((i) =>
        i.product.id === action.productId ? { ...i, quantity: clampQuantity(action.quantity) } : i,
      )
    case 'CLEAR':
      return []
    case 'REPLACE':
      return action.items
  }
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false
  const { product, quantity } = value as Partial<CartItem>
  return typeof quantity === 'number'
    && !!product
    && typeof product.id === 'string'
    && typeof product.producer_id === 'string'
    && typeof product.name === 'string'
    && typeof product.price === 'number'
    && typeof product.unit === 'string'
}

/** Le stockage peut être indisponible (navigation privée, quota) : le panier reste alors en mémoire. */
function readStoredCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    return []
  }
}

function storeCart(items: CartItem[]) {
  try {
    if (items.length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Stockage plein ou bloqué : le panier courant reste utilisable jusqu'à la fermeture de l'onglet
  }
}

function groupByProducer(items: CartItem[]): CartGroup[] {
  const groups = new Map<string, CartGroup>()
  for (const item of items) {
    const { producer_id, producer_name } = item.product
    const group = groups.get(producer_id)
      ?? { producerId: producer_id, producerName: producer_name || DEFAULT_PRODUCER_NAME, items: [], subtotal: 0 }
    group.items.push(item)
    group.subtotal += item.product.price * item.quantity
    groups.set(producer_id, group)
  }
  return [...groups.values()]
}

interface CartContextValue {
  items: CartItem[]
  groups: CartGroup[]
  total: number
  count: number
  add: (product: CartProduct, quantity?: number) => void
  remove: (productId: string) => void
  removeProducer: (producerId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, [], readStoredCart)

  useEffect(() => { storeCart(items) }, [items])

  // Panier modifié dans un autre onglet
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: 'REPLACE', items: readStoredCart() })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const groups = groupByProducer(items)
  const total = groups.reduce((sum, g) => sum + g.subtotal, 0)
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        groups,
        total,
        count,
        add: (product, quantity = 1) => dispatch({ type: 'ADD', product, quantity }),
        remove: (productId) => dispatch({ type: 'REMOVE', productId }),
        removeProducer: (producerId) => dispatch({ type: 'REMOVE_PRODUCER', producerId }),
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
