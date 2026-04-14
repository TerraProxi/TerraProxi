import { useEffect, useState } from 'react'
import { MainLayout } from '../../components/layout/MainLayout'
import { productsService, type Product } from '../../services/products.service'
import { ProductCard } from '../../components/producer/ProductCard'

const CATEGORIES = [
  { value: '', label: 'Tous' },
  { value: 'FRUITS_VEGETABLES', label: '🥦 Fruits & Légumes' },
  { value: 'DAIRY',             label: '🧀 Laitiers' },
  { value: 'MEAT',              label: '🥩 Viandes' },
  { value: 'BEVERAGES',         label: '🍷 Boissons' },
  { value: 'FINE_GROCERY',      label: '🍯 Épicerie' },
  { value: 'CRAFTS',            label: '🎨 Artisanat' },
  { value: 'FLOWERS_PLANTS',    label: '🌸 Fleurs' },
]

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    productsService
      .list({ category: category || undefined, available: 'true', search: search || undefined })
      .then(({ data }) => setProducts(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [category])

  return (
    <MainLayout>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-6)' }}>
        Produits locaux
      </h1>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        <input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          style={{
            padding: '0.5rem 0.875rem',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            width: 220,
          }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              style={{
                padding: '0.375rem 0.875rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid',
                borderColor: category === cat.value ? 'var(--color-primary)' : 'var(--color-border)',
                background: category === cat.value ? 'var(--color-primary)' : 'transparent',
                color: category === cat.value ? '#fff' : 'var(--color-dark)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontWeight: category === cat.value ? 700 : 400,
                fontSize: 'var(--text-sm)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Chargement…</p>
      ) : products.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Aucun produit trouvé.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-5)' }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </MainLayout>
  )
}
