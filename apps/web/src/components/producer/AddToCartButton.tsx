import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { toCartProduct, type ProductSummary } from '../../services/products.service'

const CONFIRMATION_DELAY_MS = 2_000

interface Props {
  product: ProductSummary
  quantity?: number
}

/** Ajout au panier avec confirmation annoncée aux lecteurs d'écran. Réservé aux visiteurs et consommateurs. */
export function AddToCartButton({ product, quantity = 1 }: Props) {
  const { user } = useAuth()
  const { add } = useCart()
  const [isAdded, setIsAdded] = useState(false)

  useEffect(() => {
    if (!isAdded) return
    const timer = window.setTimeout(() => setIsAdded(false), CONFIRMATION_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [isAdded])

  if (user && user.role !== 'CONSUMER') return null

  const handleAdd = () => {
    add(toCartProduct(product), quantity)
    setIsAdded(true)
  }

  return (
    <>
      <button type="button" className="tp-btn tp-btn--primary tp-btn--sm tp-btn--block" onClick={handleAdd}>
        {isAdded ? '✓ Ajouté' : 'Ajouter au panier'}
        <span className="sr-only"> : {product.name}</span>
      </button>
      <span className="sr-only" role="status">
        {isAdded ? `${product.name} ajouté au panier` : ''}
      </span>
    </>
  )
}
