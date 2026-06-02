import { db } from '../db/client'

export interface CatalogProduct {
  id: string
  name: string
  description: string | null
  price: number
  unit: string
  category: string
}

export interface CatalogProducer {
  id: string
  company_name: string
  description: string | null
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  distance_km: number | null
  products: CatalogProduct[]
}

interface GeoFilter {
  lat: number
  lon: number
  radiusKm: number
}

interface ProducerRow {
  id: string
  company_name: string
  description: string | null
  city: string
  address: string
  latitude: number | null
  longitude: number | null
  distance_km: number | null
}

interface ProductRow {
  id: string
  producer_id: string
  name: string
  description: string | null
  price: number
  unit: string
  category: string
}

async function fetchProducers(geo?: GeoFilter): Promise<ProducerRow[]> {
  if (geo) {
    const result = await db.query<ProducerRow>(
      `SELECT
         p.id,
         p.company_name,
         p.description,
         p.city,
         p.address,
         ST_Y(p.location::geometry) AS latitude,
         ST_X(p.location::geometry) AS longitude,
         ST_Distance(
           p.location::geography,
           ST_GeogFromText('POINT(' || $2 || ' ' || $1 || ')')
         ) / 1000 AS distance_km
       FROM producers p
       WHERE ST_DWithin(
         p.location::geography,
         ST_GeogFromText('POINT(' || $2 || ' ' || $1 || ')'),
         $3 * 1000
       )
       ORDER BY distance_km ASC
       LIMIT 40`,
      [geo.lat, geo.lon, geo.radiusKm],
    )
    return result.rows
  }

  const result = await db.query<ProducerRow>(
    `SELECT
       p.id,
       p.company_name,
       p.description,
       p.city,
       p.address,
       ST_Y(p.location::geometry) AS latitude,
       ST_X(p.location::geometry) AS longitude,
       NULL::float AS distance_km
     FROM producers p
     ORDER BY p.company_name ASC
     LIMIT 60`,
  )
  return result.rows
}

async function fetchAvailableProducts(
  producerIds: string[],
): Promise<ProductRow[]> {
  if (producerIds.length === 0) return []

  const producerIdSet = new Set(producerIds)
  const result = await db.query<ProductRow>(
    `SELECT id, producer_id, name, description, price, unit, category
     FROM products
     WHERE is_available = true
     ORDER BY name ASC`,
  )
  return result.rows.filter((product) => producerIdSet.has(product.producer_id))
}

/**
 * Charge le catalogue producteurs + produits via la couche db unifiée.
 * PostgreSQL si disponible, sinon fallback mock (seed.ts) — même interface,
 * mêmes champs injectés dans le prompt Gemini.
 */
export async function fetchProducerCatalog(
  geo?: GeoFilter,
): Promise<CatalogProducer[]> {
  const producers = await fetchProducers(geo)
  const producerIds = producers.map((p) => p.id)
  const products = await fetchAvailableProducts(producerIds)

  const productsByProducer = new Map<string, CatalogProduct[]>()
  for (const product of products) {
    const list = productsByProducer.get(product.producer_id) ?? []
    list.push({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      unit: product.unit,
      category: product.category,
    })
    productsByProducer.set(product.producer_id, list)
  }

  return producers.map((producer) => ({
    id: producer.id,
    company_name: producer.company_name,
    description: producer.description,
    city: producer.city ?? '',
    address: producer.address ?? '',
    latitude: producer.latitude != null ? Number(producer.latitude) : null,
    longitude: producer.longitude != null ? Number(producer.longitude) : null,
    distance_km: producer.distance_km != null ? Number(producer.distance_km) : null,
    products: productsByProducer.get(producer.id) ?? [],
  }))
}

export function buildCatalogContext(producers: CatalogProducer[]): string {
  if (producers.length === 0) {
    return 'Aucun producteur disponible dans le catalogue pour le moment.'
  }

  const lines = producers.map((producer) => {
    const distanceLabel = producer.distance_km != null
      ? ` (${producer.distance_km.toFixed(1)} km)`
      : ''
    const productLines = producer.products.length > 0
      ? producer.products
        .map((product) =>
          `    - ${product.name} (${product.category}) : ${product.price}€/${product.unit}`,
        )
        .join('\n')
      : '    (aucun produit listé)'

    return [
      `[producer_id=${producer.id}] ${producer.company_name}${distanceLabel}`,
      `  Ville : ${producer.city}`,
      `  Adresse : ${producer.address}`,
      producer.description ? `  Description : ${producer.description}` : null,
      '  Produits :',
      productLines,
    ].filter(Boolean).join('\n')
  })

  return lines.join('\n\n')
}
