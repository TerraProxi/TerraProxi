import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name) ?? null,
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}

export type DeliveryMode = 'delivery' | 'pickup'

export interface DeliveryAddress {
  street: string
  postalCode: string
  city: string
  extra: string
}

export const DEFAULT_DELIVERY_ADDRESS: DeliveryAddress = {
  street: '12 Rue de la Republique',
  postalCode: '34000',
  city: 'Montpellier',
  extra: '',
}

export interface CartProduct {
  id: string
  name: string
  price: number
  unit: string
  producer_id: string
  producer_name?: string
  image_url?: string
}

export interface CartItem {
  product: CartProduct
  quantity: number
}

export interface CartProducerGroup {
  producerId: string
  producerName: string
  items: CartItem[]
  deliveryMode: DeliveryMode
  deliveryAddress: DeliveryAddress
}

export type CartAddResult = 'added' | 'updated'

const computeFromGroups = (groups: CartProducerGroup[]) => {
  const items = groups.flatMap((group) => group.items)
  return {
    groups,
    items,
    total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    count: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

const createProducerGroup = (
  product: CartProduct,
): CartProducerGroup => ({
  producerId: product.producer_id,
  producerName: product.producer_name ?? 'Producteur local',
  items: [],
  deliveryMode: 'delivery',
  deliveryAddress: { ...DEFAULT_DELIVERY_ADDRESS },
})

interface CartStore {
  groups: CartProducerGroup[]
  items: CartItem[]
  total: number
  count: number
  add: (product: CartProduct, quantity?: number) => CartAddResult
  remove: (productId: string) => void
  removeProducer: (producerId: string) => void
  updateQty: (productId: string, quantity: number) => void
  setDeliveryMode: (producerId: string, mode: DeliveryMode) => void
  setDeliveryAddress: (producerId: string, address: DeliveryAddress) => void
  clear: () => void
}

function upsertProductInGroups(
  groups: CartProducerGroup[],
  product: CartProduct,
  quantity: number,
): { groups: CartProducerGroup[]; result: CartAddResult } {
  const nextGroups = groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, product: { ...item.product } })),
    deliveryAddress: { ...group.deliveryAddress },
  }))

  let groupIndex = nextGroups.findIndex((group) => group.producerId === product.producer_id)
  if (groupIndex < 0) {
    nextGroups.push(createProducerGroup(product))
    groupIndex = nextGroups.length - 1
  }

  const group = nextGroups[groupIndex]
  if (product.producer_name && group.producerName === 'Producteur local') {
    group.producerName = product.producer_name
  }

  const existing = group.items.find((item) => item.product.id === product.id)
  if (existing) {
    existing.quantity += quantity
    return { groups: nextGroups, result: 'updated' }
  }

  group.items.push({ product, quantity })
  return { groups: nextGroups, result: 'added' }
}

function removeProductFromGroups(groups: CartProducerGroup[], productId: string) {
  const nextGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.product.id !== productId),
      deliveryAddress: { ...group.deliveryAddress },
    }))
    .filter((group) => group.items.length > 0)

  return nextGroups
}

function migrateLegacyCartState(persisted: unknown): CartProducerGroup[] {
  if (!persisted || typeof persisted !== 'object') return []

  const state = persisted as {
    groups?: CartProducerGroup[]
    items?: CartItem[]
    producerId?: string | null
  }

  if (Array.isArray(state.groups)) {
    return state.groups.map((group) => ({
      ...group,
      deliveryAddress: group.deliveryAddress ?? { ...DEFAULT_DELIVERY_ADDRESS },
      deliveryMode: group.deliveryMode ?? 'delivery',
    }))
  }

  if (!Array.isArray(state.items) || state.items.length === 0) return []

  const grouped = new Map<string, CartProducerGroup>()
  for (const item of state.items) {
    const producerId = item.product.producer_id
    if (!grouped.has(producerId)) {
      grouped.set(producerId, {
        producerId,
        producerName: item.product.producer_name ?? 'Producteur local',
        items: [],
        deliveryMode: 'delivery',
        deliveryAddress: { ...DEFAULT_DELIVERY_ADDRESS },
      })
    }
    grouped.get(producerId)!.items.push(item)
  }

  return Array.from(grouped.values())
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      groups: [],
      items: [],
      total: 0,
      count: 0,

      add: (product, quantity = 1) => {
        const { groups, result } = upsertProductInGroups(get().groups, product, quantity)
        set(computeFromGroups(groups))
        return result
      },

      remove: (productId) => {
        set(computeFromGroups(removeProductFromGroups(get().groups, productId)))
      },

      removeProducer: (producerId) => {
        set(computeFromGroups(get().groups.filter((group) => group.producerId !== producerId)))
      },

      updateQty: (productId, quantity) => {
        const safeQty = Math.max(1, quantity)
        const nextGroups = get().groups.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.product.id === productId ? { ...item, quantity: safeQty } : item,
          ),
          deliveryAddress: { ...group.deliveryAddress },
        }))
        set(computeFromGroups(nextGroups))
      },

      setDeliveryMode: (producerId, mode) => {
        set(computeFromGroups(get().groups.map((group) =>
          group.producerId === producerId ? { ...group, deliveryMode: mode } : group,
        )))
      },

      setDeliveryAddress: (producerId, address) => {
        set(computeFromGroups(get().groups.map((group) =>
          group.producerId === producerId
            ? { ...group, deliveryAddress: { ...address } }
            : group,
        )))
      },

      clear: () => set({ groups: [], items: [], total: 0, count: 0 }),
    }),
    {
      name: 'cart-store-v2',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ groups: state.groups }),
      merge: (persistedState, currentState) => {
        const groups = migrateLegacyCartState(persistedState)
        return {
          ...currentState,
          ...computeFromGroups(groups),
        }
      },
    },
  ),
)

export const DELIVERY_FEE_EUR = 5
export const TVA_RATE = 0.055

export function getGroupSubtotal(group: CartProducerGroup): number {
  return group.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )
}

export function getGroupDeliveryFee(group: CartProducerGroup): number {
  return group.deliveryMode === 'delivery' ? DELIVERY_FEE_EUR : 0
}

export function getGroupTotal(group: CartProducerGroup): number {
  const subtotal = getGroupSubtotal(group)
  const delivery = getGroupDeliveryFee(group)
  return subtotal + delivery + (subtotal + delivery) * TVA_RATE
}

export function getCartGrandTotal(groups: CartProducerGroup[]): number {
  return groups.reduce((sum, group) => sum + getGroupTotal(group), 0)
}
