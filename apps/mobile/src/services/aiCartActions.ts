import type { CartProduct, CartAddResult, CartProducerGroup } from '../store/cart.store'

export interface AiCartActionAdd {
  type: 'add_to_cart'
  product: {
    product_id: string
    name: string
    price: number
    unit: string
    producer_id: string
    producer_name: string
    image_url: string | null
  }
  quantity: number
}

export interface AiCartActionRemove {
  type: 'remove_from_cart'
  product_id: string
  product_name: string
}

export interface AiCartActionUpdate {
  type: 'update_cart_quantity'
  product_id: string
  product_name: string
  quantity: number
}

export interface AiCartActionClear {
  type: 'clear_cart'
}

export type AiCartAction =
  | AiCartActionAdd
  | AiCartActionRemove
  | AiCartActionUpdate
  | AiCartActionClear

interface CartStoreApi {
  add: (product: CartProduct, quantity?: number) => CartAddResult
  remove: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
}

function toCartProduct(action: AiCartActionAdd): CartProduct {
  return {
    id: action.product.product_id,
    name: action.product.name,
    price: action.product.price,
    unit: action.product.unit,
    producer_id: action.product.producer_id,
    producer_name: action.product.producer_name,
    image_url: action.product.image_url ?? undefined,
  }
}

function formatAddedLabel(name: string, quantity: number, unit: string): string {
  return `${name} × ${quantity} ${unit}`
}

export function executeAiCartActions(
  actions: AiCartAction[],
  cart: CartStoreApi,
): string[] {
  const feedback: string[] = []

  for (const action of actions) {
    if (action.type === 'clear_cart') {
      cart.clear()
      feedback.push('Panier vidé')
      continue
    }

    if (action.type === 'remove_from_cart') {
      cart.remove(action.product_id)
      feedback.push(`${action.product_name} retiré du panier`)
      continue
    }

    if (action.type === 'update_cart_quantity') {
      cart.updateQty(action.product_id, action.quantity)
      feedback.push(
        `${action.product_name} : quantité mise à ${action.quantity}`,
      )
      continue
    }

    if (action.type === 'add_to_cart') {
      const product = toCartProduct(action)
      const result = cart.add(product, action.quantity)

      feedback.push(
        result === 'updated'
          ? `✓ ${product.name} : quantité mise à jour (${action.quantity} ${product.unit})`
          : `✓ ${formatAddedLabel(product.name, action.quantity, product.unit)} ajouté au panier`,
      )
    }
  }

  return feedback
}

export function buildCartContextPayload(cart: {
  groups: CartProducerGroup[]
  total: number
  count: number
}) {
  return {
    groups: cart.groups.map((group) => ({
      producer_id: group.producerId,
      producer_name: group.producerName,
      delivery_mode: group.deliveryMode,
      items: group.items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit: item.product.unit,
        price: item.product.price,
      })),
      subtotal: group.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      ),
    })),
    total: cart.total,
    count: cart.count,
  }
}
