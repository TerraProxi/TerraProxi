/** specs/schemas/product.schema.json#/$defs/ProductCategory */
export type ProductCategory =
  | 'FRUITS_VEGETABLES' | 'DAIRY' | 'MEAT' | 'BEVERAGES'
  | 'FINE_GROCERY' | 'CRAFTS' | 'FLOWERS_PLANTS' | 'OTHER'

/** Libellés français, identiques à ceux renvoyés par l'API dans Producer.categories. */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  FRUITS_VEGETABLES: 'Fruits & Légumes',
  DAIRY: 'Produits laitiers',
  MEAT: 'Viandes',
  BEVERAGES: 'Boissons',
  FINE_GROCERY: 'Épicerie fine',
  CRAFTS: 'Artisanat',
  FLOWERS_PLANTS: 'Fleurs & Plantes',
  OTHER: 'Autre',
}

/** specs/schemas/product.schema.json */
export interface Product {
  id: string
  producer_id: string
  name: string
  description?: string | null
  price: number
  stock: number
  unit: string
  category: ProductCategory
  image_url?: string | null
  is_available: boolean
  producer_name?: string
  producer_city?: string | null
  /** Présent quand /products est appelé avec lat, lon et radius. */
  distance_km?: number | null
}

/** specs/schemas/producer.schema.json */
export interface Producer {
  id: string
  user_id: string
  company_name: string
  description?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  website_url?: string | null
  banner_url?: string | null
  opening_hours?: string | null
  is_verified: boolean
  latitude: number | null
  longitude: number | null
  first_name?: string
  last_name?: string
  distance_km?: number | null
  /** Libellés français des catégories de ses produits disponibles. */
  categories?: string[]
}

/** specs/schemas/event.schema.json : agenda d'un producteur (marché, portes ouvertes…) */
export interface ProducerEvent {
  id: string
  producer_id: string
  producer_name: string
  producer_city: string | null
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
}

/** specs/api/ai-chat-api.yaml#/components/schemas/Recommendation */
export interface Recommendation {
  id: string
  producer_id: string
  name: string
  description?: string | null
  price: number
  unit: string
  category: ProductCategory
  image_url?: string | null
  producer_name: string
  order_count: number
}
