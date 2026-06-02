import type { CatalogProducer } from './ai-catalog.service'

export interface CartContextItem {
  product_id: string
  product_name: string
  quantity: number
  unit: string
  price: number
}

export interface CartContextGroup {
  producer_id: string
  producer_name: string
  delivery_mode: 'delivery' | 'pickup'
  items: CartContextItem[]
  subtotal: number
}

export interface CartContext {
  groups: CartContextGroup[]
  total: number
  count: number
}

export interface AiCartActionAdd {
  type: 'add_to_cart'
  product_id: string
  quantity: number
}

export interface AiCartActionRemove {
  type: 'remove_from_cart'
  product_id: string
}

export interface AiCartActionUpdate {
  type: 'update_cart_quantity'
  product_id: string
  quantity: number
}

export interface AiCartActionClear {
  type: 'clear_cart'
}

export type AiCartActionInput =
  | AiCartActionAdd
  | AiCartActionRemove
  | AiCartActionUpdate
  | AiCartActionClear

export interface ResolvedCartProduct {
  product_id: string
  name: string
  price: number
  unit: string
  producer_id: string
  producer_name: string
  image_url: string | null
}

export interface SanitizedCartActionAdd {
  type: 'add_to_cart'
  product: ResolvedCartProduct
  quantity: number
}

export interface SanitizedCartActionRemove {
  type: 'remove_from_cart'
  product_id: string
  product_name: string
}

export interface SanitizedCartActionUpdate {
  type: 'update_cart_quantity'
  product_id: string
  product_name: string
  quantity: number
}

export interface SanitizedProductPick {
  product_id: string
  name: string
  short_label: string
  price: number
  unit: string
  producer_id: string
  producer_name: string
  image_url: string | null
  quantity_options: number[]
}

export interface AiProductPickInput {
  product_id: string
  short_label?: string
  quantity_options?: number[]
}

export type SanitizedCartAction =
  | SanitizedCartActionAdd
  | SanitizedCartActionRemove
  | SanitizedCartActionUpdate
  | SanitizedCartActionClear

interface CatalogProductEntry extends ResolvedCartProduct {}

function buildProductMap(catalog: CatalogProducer[]): Map<string, CatalogProductEntry> {
  const map = new Map<string, CatalogProductEntry>()
  for (const producer of catalog) {
    for (const product of producer.products) {
      map.set(product.id, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        producer_id: producer.id,
        producer_name: producer.company_name,
        image_url: product.image_url,
      })
    }
  }
  return map
}

export function buildCartContextSection(cart?: CartContext | null): string {
  if (!cart || cart.groups.length === 0) {
    return `# PANIER ACTUEL

Le panier de l'utilisateur est **vide**. Tu peux y ajouter des produits via \`cart_actions\`.`
  }

  const groupSections = cart.groups.map((group) => {
    const lines = group.items.map(
      (item) =>
        `    - [product_id=${item.product_id}] ${item.product_name} × ${item.quantity} `
        + `(${item.price}€/${item.unit})`,
    )
    const modeLabel = group.delivery_mode === 'pickup' ? 'Retrait sur place' : 'Livraison'
    return `  **${group.producer_name}** (${group.producer_id}) — ${modeLabel}, ${group.subtotal.toFixed(2)} €
${lines.join('\n')}`
  })

  return `# PANIER ACTUEL

${cart.count} article(s) · ${cart.groups.length} producteur(s) · ${cart.total.toFixed(2)} € au total

${groupSections.join('\n\n')}

Règles panier :
- Le panier peut contenir des produits de **plusieurs producteurs** en parallèle.
- Chaque producteur a son propre mode livraison/retrait (géré dans l'app).
- Ajoute simplement les produits demandés : pas de conflit entre producteurs.`
}

function clampQuantity(value: unknown): number {
  const qty = Math.round(Number(value))
  if (!Number.isFinite(qty) || qty < 1) return 1
  return Math.min(qty, 99)
}

export function sanitizeCartActions(
  actions: AiCartActionInput[] | undefined,
  catalog: CatalogProducer[],
): SanitizedCartAction[] {
  if (!actions?.length) return []

  const productMap = buildProductMap(catalog)
  const sanitized: SanitizedCartAction[] = []

  for (const action of actions.slice(0, 3)) {
    if (action.type === 'clear_cart') {
      sanitized.push({ type: 'clear_cart' })
      continue
    }

    if (action.type === 'add_to_cart') {
      const product = productMap.get(action.product_id)
      if (!product) continue
      sanitized.push({
        type: 'add_to_cart',
        product,
        quantity: clampQuantity(action.quantity),
      })
      continue
    }

    if (action.type === 'remove_from_cart') {
      const product = productMap.get(action.product_id)
      if (!product) continue
      sanitized.push({
        type: 'remove_from_cart',
        product_id: product.product_id,
        product_name: product.name,
      })
      continue
    }

    if (action.type === 'update_cart_quantity') {
      const product = productMap.get(action.product_id)
      if (!product) continue
      sanitized.push({
        type: 'update_cart_quantity',
        product_id: product.product_id,
        product_name: product.name,
        quantity: clampQuantity(action.quantity),
      })
    }
  }

  return sanitized
}

export function sanitizeQuickReplies(replies: string[] | undefined): string[] {
  if (!replies?.length) return []
  return replies
    .map((reply) => reply.trim())
    .filter((reply) => reply.length > 0 && reply.length <= 12)
    .slice(0, 3)
}

function defaultQuantityOptions(unit: string): number[] {
  const u = unit.toLowerCase()
  if (u.includes('douz') || u.includes('boîte') || u.includes('boite')) return [1, 2]
  if (u.includes('pot') || u.includes('bouteille') || u.includes('btl')) return [1, 2, 4]
  if (u.includes('kg') || u.includes('l') || u.includes('litre')) return [1, 2, 3]
  return [1, 2]
}

function truncateLabel(value: string, maxLen: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1).trim()}…`
}

export function sanitizeProductPicks(
  picks: AiProductPickInput[] | undefined,
  catalog: CatalogProducer[],
): SanitizedProductPick[] {
  if (!picks?.length) return []

  const productMap = buildProductMap(catalog)
  const sanitized: SanitizedProductPick[] = []

  for (const pick of picks.slice(0, 5)) {
    const product = productMap.get(pick.product_id)
    if (!product) continue

    const rawOptions = pick.quantity_options?.length
      ? pick.quantity_options.map((q) => clampQuantity(q))
      : defaultQuantityOptions(product.unit)

    const quantityOptions = [...new Set(rawOptions)].sort((a, b) => a - b).slice(0, 3)
    if (quantityOptions.length === 0) continue

    sanitized.push({
      product_id: product.product_id,
      name: product.name,
      short_label: truncateLabel(pick.short_label?.trim() || product.name, 28),
      price: product.price,
      unit: product.unit,
      producer_id: product.producer_id,
      producer_name: product.producer_name,
      image_url: product.image_url,
      quantity_options: quantityOptions,
    })
  }

  return sanitized
}
