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

export const productsService = {
  list: (query?: ProductsQuery) =>
    api.get<Product[]>('/products', { params: query }),

  getById: (id: string) =>
    api.get<Product>(`/products/${id}`),

  create: (data: Omit<Product, 'id' | 'created_at' | 'producer_name'>) =>
    api.post<Product>('/products', data),

  update: (id: string, data: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete(`/products/${id}`),
}
