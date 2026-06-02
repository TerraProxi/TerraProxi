import { db } from '../db/client'

export interface CatalogProduct {
  id: string
  name: string
  description: string | null
  price: number
  unit: string
  category: string
  image_url: string | null
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
  image_url: string | null
}

async function fetchProducersInRadius(geo: GeoFilter): Promise<ProducerRow[]> {
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

/** Producteurs les plus proches sans filtre de rayon (secours si le rayon est vide). */
async function fetchProducersNearest(geo: GeoFilter): Promise<ProducerRow[]> {
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
     WHERE p.location IS NOT NULL
     ORDER BY distance_km ASC
     LIMIT 40`,
    [geo.lat, geo.lon],
  )
  return result.rows
}

async function fetchAllProducers(): Promise<ProducerRow[]> {
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

  const result = await db.query<ProductRow>(
    `SELECT id, producer_id, name, description, price, unit, category, image_url
     FROM products
     WHERE is_available = true
       AND producer_id = ANY($1)
     ORDER BY name ASC`,
    [producerIds],
  )
  return result.rows
}

/**
 * Charge le catalogue producteurs + produits via la couche db unifiée.
 * PostgreSQL si disponible, sinon fallback mock (seed.ts) — même interface,
 * mêmes champs injectés dans le prompt Gemini.
 */
export interface ProducerCatalogResult {
  producers: CatalogProducer[]
  isExpandedRadius: boolean
}

export async function fetchProducerCatalog(
  geo?: GeoFilter,
): Promise<ProducerCatalogResult> {
  let producers: ProducerRow[]
  let isExpandedRadius = false

  if (geo) {
    const inRadius = await fetchProducersInRadius(geo)
    if (inRadius.length > 0) {
      producers = inRadius
    } else {
      producers = await fetchProducersNearest(geo)
      isExpandedRadius = producers.length > 0
    }
  } else {
    producers = await fetchAllProducers()
  }

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
      image_url: product.image_url ?? null,
    })
    productsByProducer.set(product.producer_id, list)
  }

  return {
    isExpandedRadius,
    producers: producers.map((producer) => ({
      id: producer.id,
      company_name: producer.company_name,
      description: producer.description,
      city: producer.city ?? '',
      address: producer.address ?? '',
      latitude: producer.latitude != null ? Number(producer.latitude) : null,
      longitude: producer.longitude != null ? Number(producer.longitude) : null,
      distance_km: producer.distance_km != null ? Number(producer.distance_km) : null,
      products: productsByProducer.get(producer.id) ?? [],
    })),
  }
}

export function buildCatalogContext(
  producers: CatalogProducer[],
  options?: { isExpandedRadius?: boolean },
): string {
  if (producers.length === 0) {
    return 'Aucun producteur disponible dans le catalogue pour le moment.'
  }

  const radiusNote = options?.isExpandedRadius
    ? 'Note : aucun producteur dans le rayon demandé — liste des producteurs les plus proches sur TerraProxi.\n\n'
    : ''

  const lines = producers.map((producer) => {
    const distanceLabel = producer.distance_km != null
      ? ` (${producer.distance_km.toFixed(1)} km)`
      : ''
    const productLines = producer.products.length > 0
      ? producer.products
        .map((product) =>
          `    - [product_id=${product.id}] ${product.name} (${product.category}) : ${product.price}€/${product.unit}`,
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

  return radiusNote + lines.join('\n\n')
}

