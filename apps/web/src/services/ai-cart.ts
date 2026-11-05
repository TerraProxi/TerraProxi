import type { CartGroup, CartProduct } from '../contexts/CartContext'
import type { CartAction, CartContextPayload, ResolvedCartProduct } from './ai.service'

/** Limites de CartContext dans specs/schemas/ai-chat.schema.json */
const MAX_GROUPS = 10
const MAX_ITEMS_PER_GROUP = 30
const MAX_CONTEXT_QUANTITY = 99

interface CartApi {
  add: (product: CartProduct, quantity?: number) => void
  remove: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
}

export const resolvedToCartProduct = (p: ResolvedCartProduct): CartProduct => ({
  id: p.product_id,
  producer_id: p.producer_id,
  producer_name: p.producer_name,
  name: p.name,
  price: p.price,
  unit: p.unit,
  image_url: p.image_url,
})

/** Panier transmis à l'assistant pour qu'il en tienne compte (le mode de réception se choisit au panier). */
export function buildCartContext(groups: CartGroup[], total: number, count: number): CartContextPayload {
  return {
    groups: groups.slice(0, MAX_GROUPS).map((group) => ({
      producer_id: group.producerId,
      producer_name: group.producerName,
      delivery_mode: 'pickup',
      items: group.items.slice(0, MAX_ITEMS_PER_GROUP).map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: Math.min(item.quantity, MAX_CONTEXT_QUANTITY),
        unit: item.product.unit,
        price: item.product.price,
      })),
      subtotal: group.subtotal,
    })),
    total,
    count,
  }
}

/** Applique au panier les actions renvoyées par l'assistant et décrit ce qui a changé. */
export function applyCartActions(actions: CartAction[], cart: CartApi): string[] {
  return actions.map((action) => {
    switch (action.type) {
      case 'add_to_cart':
        cart.add(resolvedToCartProduct(action.product), action.quantity)
        return `${action.product.name} × ${action.quantity} ${action.product.unit} ajouté au panier`
      case 'remove_from_cart':
        cart.remove(action.product_id)
        return `${action.product_name} retiré du panier`
      case 'update_cart_quantity':
        cart.updateQty(action.product_id, action.quantity)
        return `${action.product_name} : quantité mise à ${action.quantity}`
      case 'clear_cart':
        cart.clear()
        return 'Panier vidé'
    }
  })
}
