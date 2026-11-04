import api from './api'

export interface Product {
  id: string
  producer_id: string
  name: string
  description?: string
  price: number
  stock: number
  unit: string
  category: string
  image_url?: string
  is_available: boolean
  producer_name?: string
  created_at: string
}

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
