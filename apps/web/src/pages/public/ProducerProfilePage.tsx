import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { ProductCard } from '../../components/producer/ProductCard'
import { ProducerMap } from '../../components/map/ProducerMap'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { producersService, type Producer } from '../../services/producers.service'
import { productsService, type Product } from '../../services/products.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const PRODUCER_MAP_ZOOM = 13
const PRODUCER_MAP_HEIGHT = 280

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; producer: Producer; products: Product[] }

/** PROD-5 — page publique d'un producteur. */
export function ProducerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const load = useCallback(async () => {
    if (!id) return
    setState({ kind: 'loading' })
    try {
      const [producerRes, productsRes] = await Promise.all([
        producersService.getById(id),
        productsService.list({ producer_id: id, available: 'true' }),
      ])
      setState({ kind: 'ready', producer: producerRes.data, products: productsRes.data })
    } catch (err) {
      if (apiErrorStatus(err) === 404) setState({ kind: 'not-found' })
      else setState({ kind: 'error', message: apiErrorMessage(err, 'Impossible de charger ce producteur') })
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (state.kind === 'loading') return <MainLayout title="Producteur"><p>Chargement…</p></MainLayout>
  if (state.kind === 'not-found') {
    return (
      <MainLayout title="Producteur introuvable">
        <h1 className="tp-page-title">Producteur introuvable</h1>
        <Link to="/map">Voir les producteurs sur la carte →</Link>
      </MainLayout>
    )
  }
  if (state.kind === 'error') {
    return (
      <MainLayout title="Producteur">
        <div className="tp-alert tp-alert--error" role="alert">
          {state.message} <Button variant="ghost" size="sm" onClick={load}>Réessayer</Button>
        </div>
      </MainLayout>
    )
  }

  const { producer, products } = state
  const position: [number, number] | null =
    producer.latitude != null && producer.longitude != null ? [producer.latitude, producer.longitude] : null
  const fullAddress = [producer.address, [producer.postal_code, producer.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  const canContact = !!user && user.id !== producer.user_id

  return (
    <MainLayout title={producer.company_name}>
      {producer.banner_url && (
        <img
          src={producer.banner_url}
          alt=""
          style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-6)' }}
        />
      )}

      <div className="tp-page-header">
        <h1 className="tp-page-title">{producer.company_name}</h1>
        {producer.is_verified && <Badge variant="success" label="✓ Producteur vérifié" />}
      </div>

      <div className="tp-split">
        <div>
          {producer.description && (
            <p className="tp-muted" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-6)', whiteSpace: 'pre-line' }}>
              {producer.description}
            </p>
          )}

          <h2 className="tp-section-title">Produits disponibles ({products.length})</h2>
          {products.length === 0 ? (
            <p className="tp-muted">Aucun produit disponible pour le moment.</p>
          ) : (
            <div className="tp-product-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>

        <aside className="tp-stack" aria-label="Informations pratiques">
          <section className="tp-card">
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Infos pratiques</h2>
            <dl className="tp-stack" style={{ gap: 'var(--space-3)' }}>
              {fullAddress && (
                <div>
                  <dt className="tp-label">Adresse</dt>
                  <dd>{fullAddress}</dd>
                </div>
              )}
              {producer.opening_hours && (
                <div>
                  <dt className="tp-label">Horaires d'ouverture</dt>
                  <dd style={{ whiteSpace: 'pre-line' }}>{producer.opening_hours}</dd>
                </div>
              )}
              {producer.website_url && (
                <div>
                  <dt className="tp-label">Site web</dt>
                  <dd>
                    <a href={producer.website_url} target="_blank" rel="noopener noreferrer">
                      {producer.website_url.replace(/^https?:\/\//, '')}
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {canContact && (
              <Link to={`/messages/${producer.user_id}`} className="tp-btn tp-btn--primary tp-btn--md tp-btn--block" style={{ marginTop: 'var(--space-4)' }}>
                💬 Contacter le producteur
              </Link>
            )}
          </section>

          {position && (
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <ProducerMap
                producers={[producer]}
                center={position}
                zoom={PRODUCER_MAP_ZOOM}
                height={PRODUCER_MAP_HEIGHT}
                label={`Localisation de ${producer.company_name}`}
              />
            </div>
          )}
        </aside>
      </div>
    </MainLayout>
  )
}
