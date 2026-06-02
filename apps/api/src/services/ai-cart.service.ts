import type { CatalogProducer } from './ai-catalog.service'

export interface CartContextItem {
  product_id: string
  product_name: string
  quantity: number
  unit: string
  price: number
}

export interface CartContext {
  producer_id: string | null
  producer_name: string | null
  items: CartContextItem[]
  total: number
  count: number
}

export interface AiCartActionAdd {
  type: 'add_to_cart'
  product_id: string
  quantity: number
  replace_cart?: boolean
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
  replace_cart: boolean
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

export interface SanitizedCartActionClear {
  type: 'clear_cart'
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
  if (!cart || cart.items.length === 0) {
    return `# PANIER ACTUEL

Le panier de l'utilisateur est **vide**. Tu peux y ajouter des produits via \`cart_actions\`.`
  }

  const lines = cart.items.map(
    (item) =>
      `  - [product_id=${item.product_id}] ${item.product_name} × ${item.quantity} `
      + `(${item.price}€/${item.unit})`,
  )

  return `# PANIER ACTUEL

Producteur du panier : **${cart.producer_name ?? cart.producer_id}** (${cart.count} article(s), ${cart.total.toFixed(2)} €)

${lines.join('\n')}

Règles panier :
- Un panier = **un seul producteur** à la fois.
- Pour ajouter un produit d'un **autre** producteur : demande d'abord confirmation
  (propose \`quick_replies\` : « Vider le panier et ajouter », « Garder mon panier »).
- N'utilise \`replace_cart: true\` sur \`add_to_cart\` **que si** l'utilisateur a confirmé.`
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
        replace_cart: action.replace_cart === true,
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
    .filter((reply) => reply.length > 0 && reply.length <= 80)
    .slice(0, 4)
}
