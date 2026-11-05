import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../producer/ProductCard'
import { aiService, type Recommendation } from '../../services/ai.service'
import { apiErrorMessage } from '../../services/api'

/** AI-2 — produits appréciés des autres clients, jamais achetés par l'utilisateur connecté. */
export function Recommendations() {
  const [products, setProducts] = useState<Recommendation[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    aiService.recommendations()
      .then(({ data }) => setProducts(data))
      .catch((err) => setError(apiErrorMessage(err, 'Recommandations indisponibles pour le moment')))
  }, [])

  if (!error && products.length === 0) return null

  return (
    <section className="tp-section" aria-labelledby="titre-recommandations">
      <div className="tp-page-header">
        <h2 id="titre-recommandations" className="tp-section-title" style={{ marginBottom: 0 }}>Recommandé pour vous</h2>
        <Link to="/assistant" style={{ fontWeight: 600 }}>Demander à l'assistant →</Link>
      </div>
      {error ? (
        <p className="tp-muted">{error}</p>
      ) : (
        <div className="tp-product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  )
}
