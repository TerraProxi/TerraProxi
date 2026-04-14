import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { producersService, type Producer } from '../../services/producers.service'
import { useGeolocation } from '../../hooks/useGeolocation'
import { ProductCard } from '../../components/producer/ProductCard'
import { productsService, type Product } from '../../services/products.service'

export function HomePage() {
  const [producers, setProducers] = useState<Producer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const { lat, lon, request } = useGeolocation()
  const navigate = useNavigate()

  useEffect(() => {
    productsService.list({ limit: 8, available: 'true' }).then((r) => setProducts(r.data))
    if (lat && lon) {
      producersService.list({ lat, lon, radius: 50, limit: 6 }).then((r) => setProducers(r.data))
    } else {
      producersService.list({ limit: 6 }).then((r) => setProducers(r.data))
    }
  }, [lat, lon])

  return (
    <>
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #EBF8F0 0%, #E5F5F7 100%)',
          padding: 'var(--space-16) var(--space-6)',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              color: 'var(--color-secondary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Les producteurs locaux,<br />
            <span style={{ color: 'var(--color-primary)' }}>à portée de main.</span>
          </h1>
          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-8)',
              maxWidth: 560,
              margin: '0 auto var(--space-8)',
            }}
          >
            Commandez des produits frais directement auprès des agriculteurs et artisans
            de votre région. Traçabilité totale, aucun intermédiaire.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { request(); navigate('/map') }}
              style={{
                background: 'var(--color-secondary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 2rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 'var(--text-base)',
                cursor: 'pointer',
              }}
            >
              🗺️ Découvrir sur la carte
            </button>
            <Link
              to="/products"
              style={{
                background: 'transparent',
                color: 'var(--color-secondary)',
                border: '2px solid var(--color-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 2rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 'var(--text-base)',
              }}
            >
              Voir les produits
            </Link>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="container" style={{ padding: 'var(--space-12) var(--space-6)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {[
            { icon: '🌍', title: 'Proximité', desc: 'Des producteurs sélectionnés dans votre région' },
            { icon: '✅', title: 'Traçabilité', desc: 'Connaître l\'origine exacte de chaque produit' },
            { icon: '🤝', title: 'Direct', desc: 'Sans intermédiaire, le producteur fixe son prix' },
            { icon: '📱', title: 'Simple', desc: 'Commandez en quelques clics, retirez quand vous voulez' },
          ].map((v) => (
            <div
              key={v.title}
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 'var(--space-3)' }}>{v.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-2)' }}>{v.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Produits récents */}
      {products.length > 0 && (
        <section className="container" style={{ paddingBottom: 'var(--space-12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)' }}>
              Produits disponibles
            </h2>
            <Link to="/products" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Tout voir →
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 'var(--space-5)',
            }}
          >
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* CTA producteur */}
      <section
        style={{
          background: 'var(--color-secondary)',
          color: '#fff',
          padding: 'var(--space-12) var(--space-6)',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
            Vous êtes producteur ?
          </h2>
          <p style={{ fontSize: 'var(--text-lg)', opacity: 0.9, marginBottom: 'var(--space-8)', maxWidth: 480, margin: '0 auto var(--space-8)' }}>
            Créez votre boutique en ligne, gérez vos stocks et commandes, et touchez
            de nouveaux clients dans votre région.
          </p>
          <Link
            to="/register?role=PRODUCER"
            style={{
              background: '#fff',
              color: 'var(--color-secondary)',
              padding: '0.875rem 2.5rem',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 'var(--text-base)',
            }}
          >
            Créer mon espace producteur
          </Link>
        </div>
      </section>
    </>
  )
}
