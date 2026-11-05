import { useCallback, useEffect, useRef, useState } from 'react'
import { ORDERS_PAGE_SIZE, ordersService, type Order, type OrderStatus } from '../services/orders.service'
import { apiErrorMessage } from '../services/api'

/** GET /orders par pages de 20 (limit/offset), rechargé à chaque changement de filtre. */
export function usePaginatedOrders(status?: OrderStatus) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ignore les réponses d'un filtre qui n'est plus affiché
  const requestId = useRef(0)

  /** Renvoie false si la réponse est arrivée après un changement de filtre (et a été ignorée). */
  const fetchPage = useCallback(async (offset: number) => {
    const id = ++requestId.current
    try {
      const { data } = await ordersService.list({ status, limit: ORDERS_PAGE_SIZE, offset })
      if (id !== requestId.current) return false
      setOrders((current) => (offset === 0 ? data : [...current, ...data]))
      setHasMore(data.length === ORDERS_PAGE_SIZE)
      setError(null)
    } catch (err) {
      if (id !== requestId.current) return false
      setError(apiErrorMessage(err, 'Impossible de charger les commandes'))
    }
    return true
  }, [status])

  const reload = useCallback(async () => {
    setIsLoading(true)
    if (await fetchPage(0)) setIsLoading(false)
  }, [fetchPage])

  useEffect(() => {
    setOrders([])
    reload()
  }, [reload])

  const loadMore = async () => {
    setIsLoadingMore(true)
    await fetchPage(orders.length)
    setIsLoadingMore(false)
  }

  const replaceOrder = (updated: Order) =>
    setOrders((list) => list.map((o) => (o.id === updated.id ? { ...o, ...updated, items: updated.items ?? o.items } : o)))

  return { orders, isLoading, isLoadingMore, hasMore, error, setError, reload, loadMore, replaceOrder }
}
