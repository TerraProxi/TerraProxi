import api from './api'
import type { CartProduct } from '../contexts/CartContext'

export interface Product {
  id: string
  producer_id: string
  name: string
  description?: string | null
  price: number
  stock: number
  unit: string
  category: string
  image_url?: string | null
  is_available: boolean
  producer_name?: string
  /** Présent dans GET /products/{id} uniquement. */
  producer_city?: string | null
  created_at: string
}

/** Ce qu'une vignette produit affiche : produit du catalogue ou recommandation (AI-2). */
export type ProductSummary =
  Pick<Product, 'id' | 'producer_id' | 'name' | 'price' | 'unit' | 'category' | 'description' | 'image_url' | 'producer_name'>
  & Partial<Pick<Product, 'stock' | 'is_available'>>

export const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  FRUITS_VEGETABLES: '🥦 Fruits & Légumes',
  DAIRY:             '🧀 Produits laitiers',
  MEAT:              '🥩 Viandes',
  BEVERAGES:         '🍷 Boissons',
  FINE_GROCERY:      '🍯 Épicerie fine',
  CRAFTS:            '🎨 Artisanat',
  FLOWERS_PLANTS:    '🌸 Fleurs & Plantes',
  OTHER:             '📦 Autre',
}

export const toCartProduct = (p: ProductSummary): CartProduct => ({
  id: p.id,
  producer_id: p.producer_id,
  producer_name: p.producer_name,
  name: p.name,
  price: Number(p.price),
  unit: p.unit,
  image_url: p.image_url,
})

export interface ProductsQuery {
  producer_id?: string
  category?: string
  available?: string
  search?: string
  limit?: number
  offset?: number
}

/** Champs acceptés par POST/PUT /products (le producteur vient du jeton). */
export interface ProductInput {
  name: string
  description?: string
  price: number
  stock: number
  unit?: string
  category?: string
  image_url?: string
  is_available?: boolean
}

/** Construit un corps valide : l'API refuse `null` et les champs inconnus. */
export function toProductInput(p: Partial<Product>): ProductInput {
  return {
    name: (p.name ?? '').trim(),
    description: p.description?.trim() || undefined,
    price: Number(p.price ?? 0),
    stock: Math.max(0, Math.trunc(Number(p.stock ?? 0))),
    unit: p.unit?.trim() || undefined,
    category: p.category || undefined,
    image_url: p.image_url?.trim() || undefined,
    is_available: p.is_available ?? true,
  }
}

export const productsService = {
  list: (query?: ProductsQuery) =>
    api.get<Product[]>('/products', { params: query }),

  getById: (id: string) =>
    api.get<Product>(`/products/${id}`),

  /** Catalogue du producteur connecté, produits masqués compris. */
  mine: () => api.get<Product[]>('/products/mine'),

  create: (data: ProductInput) => api.post<Product>('/products', data),

  update: (id: string, data: ProductInput) => api.put<Product>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete(`/products/${id}`),
}
