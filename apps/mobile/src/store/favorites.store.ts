import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistentStorage } from '../services/storage'

interface FavoritesStore {
  producerIds: string[]
  productIds: string[]
  toggleProducer: (id: string) => void
  toggleProduct: (id: string) => void
  isProducerFavorite: (id: string) => boolean
  isProductFavorite: (id: string) => boolean
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      producerIds: [],
      productIds: [],
      toggleProducer: (id) => set((s) => ({
        producerIds: s.producerIds.includes(id) ? s.producerIds.filter(x => x !== id) : [...s.producerIds, id]
      })),
      toggleProduct: (id) => set((s) => ({
        productIds: s.productIds.includes(id) ? s.productIds.filter(x => x !== id) : [...s.productIds, id]
      })),
      isProducerFavorite: (id) => get().producerIds.includes(id),
      isProductFavorite: (id) => get().productIds.includes(id),
    }),
    { name: 'favorites-store', storage: persistentStorage }
  )
)
