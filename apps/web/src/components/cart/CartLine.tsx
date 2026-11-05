import { Link } from 'react-router-dom'
import type { CartItem } from '../../contexts/CartContext'
import { formatPrice } from '../../utils/format'

interface Props {
  item: CartItem
  onQuantityChange: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
}

export function CartLine({ item: { product, quantity }, onQuantityChange, onRemove }: Props) {
  return (
    <div className="tp-cart-line">
      {product.image_url ? (
        <img className="tp-cart-line__thumb" src={product.image_url} alt="" loading="lazy" />
      ) : (
        <div className="tp-cart-line__thumb" aria-hidden="true">🌿</div>
      )}

      <div className="tp-cart-line__info">
        <Link to={`/products/${product.id}`} style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-dark)' }}>
          {product.name}
        </Link>
        <div className="tp-small tp-muted">{formatPrice(product.price)} / {product.unit}</div>
      </div>

      <div className="tp-qty">
        <button
          type="button"
          aria-label={`Diminuer la quantité de ${product.name}`}
          disabled={quantity <= 1}
          onClick={() => onQuantityChange(product.id, quantity - 1)}
        >
          −
        </button>
        <output aria-label={`Quantité de ${product.name}`}>{quantity}</output>
        <button
          type="button"
          aria-label={`Augmenter la quantité de ${product.name}`}
          onClick={() => onQuantityChange(product.id, quantity + 1)}
        >
          +
        </button>
      </div>

      <div className="tp-cart-line__total" style={{ fontWeight: 700 }}>
        {formatPrice(product.price * quantity)}
      </div>

      <button
        type="button"
        className="tp-icon-btn"
        aria-label={`Retirer ${product.name} du panier`}
        onClick={() => onRemove(product.id)}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  )
}
