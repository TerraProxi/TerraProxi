import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { ProductCard } from '../../components/producer/ProductCard'
import { NearbyProducers } from '../../components/home/NearbyProducers'
import { Recommendations } from '../../components/home/Recommendations'
import { UpcomingEvents } from '../../components/home/UpcomingEvents'
import { productsService, type Product } from '../../services/products.service'
import { apiErrorMessage } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useGeolocation, type MapNavigationState } from '../../hooks/useGeolocation'

const HOME_PRODUCTS_LIMIT = 8

const VALUES = [
  { icon: '🌍', title: 'Proximité', desc: 'Des producteurs sélectionnés dans votre région' },
  { icon: '✅', title: 'Traçabilité', desc: 'Connaître l\'origine exacte de chaque produit' },
  { icon: '🤝', title: 'Direct', desc: 'Sans intermédiaire, le producteur fixe son prix' },
  { icon: '📱', title: 'Simple', desc: 'Commandez en quelques clics, retirez quand vous voulez' },
]

const LOCATE_ON_MAP: MapNavigationState = { shouldLocate: true }

export function HomePage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [productsError, setProductsError] = useState<string | null>(null)
  const isConsumer = user?.role === 'CONSUMER'
  const { lat, lon, loading: isLocating, error: geoError, request: locate } = useGeolocation()
  const position = lat != null && lon != null ? { lat, lon } : null

  useEffect(() => {
    productsService.list({ limit: HOME_PRODUCTS_LIMIT, available: 'true' })
      .then(({ data }) => setProducts(data))
      .catch((err) => setProductsError(apiErrorMessage(err, 'Impossible de charger les produits')))
  }, [])

  return (
    <MainLayout title="TerraProxi" fullWidth>
      <section className="tp-hero">
        <div className="container">
          <h1>
            Les producteurs locaux,<br />
            <span>à portée de main.</span>
          </h1>
          <p>
            Commandez des produits frais directement auprès des agriculteurs et artisans
            de votre région. Traçabilité totale, aucun intermédiaire.
          </p>
          <div className="tp-cluster" style={{ justifyContent: 'center' }}>
            <Link to="/map" state={LOCATE_ON_MAP} className="tp-btn tp-btn--secondary tp-btn--lg">
              <span aria-hidden="true">🗺️</span> Découvrir sur la carte
            </Link>
            <Link to="/products" className="tp-btn tp-btn--outline tp-btn--lg">Voir les produits</Link>
          </div>
        </div>
      </section>

      <div className="container tp-page">
        <section className="tp-section" aria-label="Nos engagements">
          <div className="tp-card-grid">
            {VALUES.map((v) => (
              <div key={v.title} className="tp-card" style={{ textAlign: 'center' }}>
                <div aria-hidden="true" style={{ fontSize: 36, marginBottom: 'var(--space-3)' }}>{v.icon}</div>
                <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{v.title}</h2>
                <p className="tp-small tp-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {geoError && <p className="tp-alert tp-alert--error" role="alert">{geoError}</p>}
        <NearbyProducers position={position} isLocating={isLocating} onLocate={locate} />
        <UpcomingEvents position={position} />

        {isConsumer && <Recommendations />}

        <section className="tp-section" aria-labelledby="titre-produits">
          <div className="tp-page-header">
            <h2 id="titre-produits" className="tp-section-title" style={{ marginBottom: 0 }}>Produits disponibles</h2>
            <Link to="/products" style={{ fontWeight: 600 }}>Tout voir →</Link>
          </div>
          {productsError ? (
            <p className="tp-alert tp-alert--error" role="alert">{productsError}</p>
          ) : (
            <div className="tp-product-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      </div>

      <section className="tp-cta">
        <div className="container">
          <h2>Vous êtes producteur ?</h2>
          <p>
            Créez votre boutique en ligne, gérez vos stocks et commandes, et touchez
            de nouveaux clients dans votre région.
          </p>
          <Link to="/register?role=PRODUCER" className="tp-btn tp-btn--on-dark tp-btn--lg">
            Créer mon espace producteur
          </Link>
        </div>
      </section>
    </MainLayout>
  )
}
