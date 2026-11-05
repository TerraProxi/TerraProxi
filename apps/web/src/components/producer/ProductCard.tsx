import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, type ProductSummary } from '../../services/products.service'
import { formatPrice } from '../../utils/format'
import { AddToCartButton } from './AddToCartButton'

const DESCRIPTION_PREVIEW_LENGTH = 80

interface Props {
  product: ProductSummary
}

export function ProductCard({ product }: Props) {
  const { stock, is_available: isAvailable = true } = product
  const isInStock = stock === undefined || stock > 0
  const description = product.description ?? ''

  return (
    <article className="tp-product-card">
      {product.image_url ? (
        // Le nom du produit suit immédiatement : l'image est décorative ici
        <img className="tp-product-card__media" src={product.image_url} alt="" loading="lazy" />
      ) : (
        <div className="tp-product-card__placeholder" aria-hidden="true">🌿</div>
      )}

      <div className="tp-product-card__body">
        <span className="tp-product-card__category">
          {CATEGORY_LABELS[product.category] ?? product.category}
        </span>

        <h3 className="tp-product-card__title">
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>

        {product.producer_name && (
          <p className="tp-small tp-muted">
            {product.producer_name}
            {product.distance_km !== undefined && <> · à {product.distance_km.toFixed(1).replace('.', ',')} km</>}
          </p>
        )}

        {description && (
          <p className="tp-small tp-muted">
            {description.slice(0, DESCRIPTION_PREVIEW_LENGTH)}{description.length > DESCRIPTION_PREVIEW_LENGTH ? '…' : ''}
          </p>
        )}

        <div className="tp-product-card__footer">
          <span>
            <span className="tp-price">{formatPrice(product.price)}</span>
            <span className="tp-small tp-muted"> / {product.unit}</span>
          </span>
          {stock !== undefined && (
            <span className={isInStock ? 'tp-stock--ok' : 'tp-stock--out'}>
              {isInStock ? `${stock} dispo` : 'Rupture'}
            </span>
          )}
        </div>

        {isAvailable && isInStock && <AddToCartButton product={product} />}
      </div>
    </article>
  )
}
