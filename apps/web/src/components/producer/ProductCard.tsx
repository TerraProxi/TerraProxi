import type { Product } from '../../services/products.service'
import { useCart } from '../../contexts/CartContext'

interface Props {
  product: Product
  showActions?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  FRUITS_VEGETABLES: '🥦 Fruits & Légumes',
  DAIRY:             '🧀 Produits laitiers',
  MEAT:              '🥩 Viandes',
  BEVERAGES:         '🍷 Boissons',
  FINE_GROCERY:      '🍯 Épicerie fine',
  CRAFTS:            '🎨 Artisanat',
  FLOWERS_PLANTS:    '🌸 Fleurs & Plantes',
  OTHER:             '📦 Autre',
}

export function ProductCard({ product, showActions = true }: Props) {
  const { add } = useCart()

  return (
    <div
      style={{
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform var(--transition), box-shadow var(--transition)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: 160,
          background: product.image_url
            ? `url(${product.image_url}) center/cover`
            : 'linear-gradient(135deg, var(--color-light-bg), var(--color-border))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
        }}
      >
        {!product.image_url && '🌿'}
      </div>

      <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4 }}>
          {CATEGORY_LABELS[product.category] ?? product.category}
        </span>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-base)', marginBottom: 4 }}>
          {product.name}
        </h3>

        {product.description && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 8, flex: 1 }}>
            {product.description.slice(0, 80)}{product.description.length > 80 ? '…' : ''}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-secondary)' }}>
              {Number(product.price).toFixed(2)} €
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 4 }}>
              / {product.unit}
            </span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: product.stock > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {product.stock > 0 ? `${product.stock} dispo` : 'Rupture'}
          </span>
        </div>

        {showActions && product.is_available && product.stock > 0 && (
          <button
            onClick={() => add(product)}
            style={{
              marginTop: 'var(--space-3)',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'var(--font-body)',
            }}
          >
            Ajouter au panier
          </button>
        )}
      </div>
    </div>
  )
}
