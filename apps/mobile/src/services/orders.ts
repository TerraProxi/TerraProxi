import { apiErrorMessage } from './api'
import type { CartProducerGroup } from '../store/cart.store'

export interface OrdersOutcome {
  orderIds: string[]
  /** Une ligne lisible par producteur refusé : « • Nom : message de l'API ». */
  failures: string[]
}

/**
 * Une commande par producteur, l'une après l'autre : chaque producteur commandé avec
 * succès quitte le panier (`onOrdered`), les refusés y restent et sont listés.
 */
export async function placeOrdersByProducer(
  groups: readonly CartProducerGroup[],
  createOrder: (group: CartProducerGroup) => Promise<string>,
  onOrdered: (producerId: string) => void,
): Promise<OrdersOutcome> {
  const orderIds: string[] = []
  const failures: string[] = []
  for (const group of [...groups]) {
    try {
      orderIds.push(await createOrder(group))
      onOrdered(group.producerId)
    } catch (err) {
      failures.push(`• ${group.producerName} : ${apiErrorMessage(err, 'commande refusée')}`)
    }
  }
  return { orderIds, failures }
}
