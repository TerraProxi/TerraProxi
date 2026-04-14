import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { producersService, type Producer } from '../../services/producers.service'
import { productsService, type Product } from '../../services/products.service'
import { ProductCard } from '../../components/producer/ProductCard'
import { ProducerMap } from '../../components/map/ProducerMap'
import { useAuth } from '../../contexts/AuthContext'

export function ProducerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      producersService.getById(id),
      productsService.list({ producer_id: id, available: 'true' }),
    ]).then(([pRes, prodRes]) => {
      setProducer(pRes.data)
      setProducts(prodRes.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <MainLayout><p>Chargement…</p></MainLayout>
  if (!producer) return <MainLayout><p>Producteur introuvable.</p></MainLayout>

  return (
    <MainLayout>
      {/* Bandeau */}
      <div
        style={{
          height: 220,
          background: producer.banner_url
            ? `url(${producer.banner_url}) center/cover`
            : 'linear-gradient(135deg, #EBF8F0, #E5F5F7)',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: 'var(--space-6)',
        }}
      >
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-4xl)', color: 'var(--color-dark)', textShadow: '0 1px 3px rgba(255,255,255,.7)' }}>
          {producer.company_name}
          {producer.is_verified && ' ✅'}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)', alignItems: 'start' }}>
        <div>
          {/* Description */}
          {producer.description && (
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
              {producer.description}
            </p>
          )}

          {/* Infos */}
          <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', marginBottom: 'var(--space-8)', fontSize: 'var(--text-sm)' }}>
            {producer.city && <span>📍 {producer.city} {producer.postal_code}</span>}
            {producer.website_url && <a href={producer.website_url} target="_blank" rel="noopener noreferrer">🌐 Site web</a>}
            {user && (
              <Link to={`/messages/${producer.user_id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                💬 Contacter
              </Link>
            )}
          </div>

          {/* Produits */}
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-5)' }}>
            Produits disponibles ({products.length})
          </h2>

          {products.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Aucun produit disponible pour le moment.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-5)' }}>
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>

        {/* Carte */}
        <aside>
          {producer.latitude && producer.longitude && (
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <ProducerMap
                producers={[producer]}
                center={[producer.latitude, producer.longitude]}
                zoom={13}
                height={280}
              />
            </div>
          )}
        </aside>
      </div>
    </MainLayout>
  )
}
