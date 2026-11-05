import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { adminService, type AdminProducer } from '../../services/admin.service'
import { apiErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

/** Producteurs pas encore vérifiés ; la vérification notifie le producteur (notification ACCOUNT). */
export function ProducersToVerify({ onChanged }: { onChanged: () => void }) {
  const [producers, setProducers] = useState<AdminProducer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    adminService.producers({ verified: false })
      .then(({ data }) => { setProducers(data); setError(null) })
      .catch((err) => setError(apiErrorMessage(err, 'Impossible de charger les producteurs à vérifier')))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const verify = async (producer: AdminProducer) => {
    setPendingId(producer.id)
    try {
      await adminService.setProducerVerified(producer.id, true)
      setProducers((list) => list.filter((p) => p.id !== producer.id))
      setNotice(`${producer.company_name} est maintenant vérifié.`)
      onChanged()
    } catch (err) {
      setError(apiErrorMessage(err, 'Vérification impossible'))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="tp-card" aria-labelledby="titre-verification">
      <h2 id="titre-verification" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Producteurs à vérifier</h2>
      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}
      <p role="status" className={notice ? 'tp-alert tp-alert--success' : 'sr-only'}>{notice}</p>

      {isLoading ? (
        <p>Chargement…</p>
      ) : producers.length === 0 ? (
        <p className="tp-muted">Aucun producteur en attente de vérification.</p>
      ) : (
        <ul className="tp-stack" style={{ listStyle: 'none' }}>
          {producers.map((producer) => (
            <li key={producer.id} className="tp-order-card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div>
                <Link to={`/producers/${producer.id}`} style={{ fontWeight: 700 }}>{producer.company_name}</Link>
                <span className="tp-small tp-muted" style={{ display: 'block' }}>
                  {producer.first_name} {producer.last_name} · {producer.email}
                </span>
                <span className="tp-small tp-muted" style={{ display: 'block' }}>
                  {[producer.postal_code, producer.city].filter(Boolean).join(' ') || 'Ville non renseignée'}
                  {' · '}{producer.product_count} produit{producer.product_count > 1 ? 's' : ''}
                  {' · '}inscrit le {formatDate(producer.created_at, 'd MMM yyyy')}
                  {!producer.is_active && ' · compte suspendu'}
                </span>
                {producer.website_url && (
                  <a href={producer.website_url} target="_blank" rel="noopener noreferrer" className="tp-small">
                    {producer.website_url.replace(/^https?:\/\//, '')}<span className="sr-only"> (nouvel onglet)</span>
                  </a>
                )}
              </div>
              <Button variant="secondary" size="sm" loading={pendingId === producer.id} onClick={() => verify(producer)}>
                Vérifier<span className="sr-only"> {producer.company_name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
