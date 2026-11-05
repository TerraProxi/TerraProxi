import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MainLayout } from '../../components/layout/MainLayout'
import { ProductCard } from '../../components/producer/ProductCard'
import { Button } from '../../components/ui/Button'
import { CATEGORY_LABELS, productsService, type Product } from '../../services/products.service'
import { apiErrorMessage } from '../../services/api'

const CATEGORY_FILTERS = [{ value: '', label: 'Tous' }].concat(
  Object.entries(CATEGORY_LABELS)
    .filter(([value]) => value !== 'OTHER')
    .map(([value, label]) => ({ value, label })),
)

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    productsService
      .list({ category: category || undefined, available: 'true', search: submittedSearch || undefined })
      .then(({ data }) => setProducts(data))
      .catch((err) => setError(apiErrorMessage(err, 'Impossible de charger les produits')))
      .finally(() => setLoading(false))
  }, [category, submittedSearch])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (search.trim() === submittedSearch) load()
    else setSubmittedSearch(search.trim())
  }

  return (
    <MainLayout title="Produits locaux">
      <h1 className="tp-page-title">Produits locaux</h1>

      <div className="tp-stack" style={{ marginBottom: 'var(--space-6)' }}>
        <form role="search" onSubmit={handleSearch} style={{ maxWidth: 420 }}>
          <label htmlFor="recherche-produit" className="tp-label">Rechercher un produit</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
            <input
              id="recherche-produit"
              type="search"
              className="tp-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline">Chercher</Button>
          </div>
        </form>

        <div className="tp-cluster" role="group" aria-label="Filtrer par catégorie">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className="tp-chip"
              aria-pressed={category === cat.value}
              onClick={() => setCategory(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {error ? (
          <div className="tp-alert tp-alert--error" role="alert">
            {error} <Button variant="ghost" size="sm" onClick={load}>Réessayer</Button>
          </div>
        ) : loading ? (
          <p className="tp-muted">Chargement…</p>
        ) : products.length === 0 ? (
          <p className="tp-muted">Aucun produit trouvé.</p>
        ) : (
          <div className="tp-product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
