import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { AddToCartButton } from '../../components/producer/AddToCartButton'
import { Button } from '../../components/ui/Button'
import { CATEGORY_LABELS, productsService, type Product } from '../../services/products.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { formatPrice } from '../../utils/format'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; product: Product }

/** CAT-5 — fiche détaillée d'un produit (GET /products/{id}). */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [quantity, setQuantity] = useState(1)

  const load = useCallback(async () => {
    if (!id) return
    setState({ kind: 'loading' })
    try {
      const { data } = await productsService.getById(id)
      setState({ kind: 'ready', product: data })
    } catch (err) {
      if (apiErrorStatus(err) === 404) setState({ kind: 'not-found' })
      else setState({ kind: 'error', message: apiErrorMessage(err, 'Impossible de charger ce produit') })
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (state.kind === 'loading') return <MainLayout title="Produit"><p>Chargement…</p></MainLayout>
  if (state.kind === 'not-found') {
    return (
      <MainLayout title="Produit introuvable">
        <h1 className="tp-page-title">Produit introuvable</h1>
        <Link to="/products">Voir tous les produits →</Link>
      </MainLayout>
    )
  }
  if (state.kind === 'error') {
    return (
      <MainLayout title="Produit">
        <div className="tp-alert tp-alert--error" role="alert">
          {state.message} <Button variant="ghost" size="sm" onClick={load}>Réessayer</Button>
        </div>
      </MainLayout>
    )
  }

  const { product } = state
  const canBuy = product.is_available && product.stock > 0
  const maxQuantity = Math.max(1, product.stock)

  return (
    <MainLayout title={product.name}>
      <p className="tp-small" style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/products">← Tous les produits</Link>
      </p>

      <div className="tp-split">
        <div>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 'var(--radius-xl)' }}
            />
          ) : (
            <div className="tp-product-card__placeholder" aria-hidden="true" style={{ height: 280, borderRadius: 'var(--radius-xl)' }}>🌿</div>
          )}
          {product.description && (
            <section style={{ marginTop: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Description</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
            </section>
          )}
        </div>

        <section className="tp-card" aria-labelledby="titre-produit">
          <span className="tp-product-card__category">{CATEGORY_LABELS[product.category] ?? product.category}</span>
          <h1 id="titre-produit" style={{ fontSize: 'var(--text-2xl)', margin: 'var(--space-1) 0 var(--space-3)' }}>{product.name}</h1>
          <p style={{ marginBottom: 'var(--space-3)' }}>
            <span className="tp-price" style={{ fontSize: 'var(--text-2xl)' }}>{formatPrice(product.price)}</span>
            <span className="tp-muted"> / {product.unit}</span>
          </p>
          <p className={canBuy ? 'tp-stock--ok' : 'tp-stock--out'} style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
            {canBuy ? `${product.stock} en stock` : 'Indisponible pour le moment'}
          </p>

          {product.producer_name && (
            <p className="tp-small" style={{ marginBottom: 'var(--space-4)' }}>
              Produit par <Link to={`/producers/${product.producer_id}`}>{product.producer_name}</Link>
              {product.producer_city && <span className="tp-muted"> — {product.producer_city}</span>}
            </p>
          )}

          {canBuy && (
            <>
              <div className="tp-field">
                <label htmlFor="quantite" className="tp-label">Quantité</label>
                <input
                  id="quantite"
                  type="number"
                  className="tp-input"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, Math.trunc(Number(e.target.value) || 1))))}
                  style={{ maxWidth: 120 }}
                />
              </div>
              <AddToCartButton product={product} quantity={quantity} />
            </>
          )}
        </section>
      </div>
    </MainLayout>
  )
}
