import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { Button } from '../../components/ui/Button'
import { ErrorList } from '../../components/ui/ErrorList'
import { CartLine } from '../../components/cart/CartLine'
import { DeliveryOptionsFields, type CheckoutOptions } from '../../components/cart/DeliveryOptionsFields'
import { useCart, type CartGroup } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { ordersService, type CreateOrderPayload } from '../../services/orders.service'
import { apiErrorMessage } from '../../services/api'
import { formatPrice } from '../../utils/format'

const DEFAULT_OPTIONS: CheckoutOptions = { deliveryMode: 'pickup', deliveryAddress: '', notes: '' }

function toOrderPayload(group: CartGroup, options: CheckoutOptions): CreateOrderPayload {
  const notes = options.notes.trim()
  return {
    producer_id: group.producerId,
    items: group.items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
    delivery_mode: options.deliveryMode,
    ...(options.deliveryMode === 'delivery' && { delivery_address: options.deliveryAddress.trim() }),
    ...(notes && { notes }),
  }
}

/** ORDER-1 — un panier multi-producteurs devient une commande par producteur (specs/schemas/cart.schema.json). */
export function CartPage() {
  const { groups, total, count, updateQty, remove, removeProducer } = useCart()
  const { isAuthenticated } = useAuth()
  const [options, setOptions] = useState<Record<string, CheckoutOptions>>({})
  const [isOrdering, setIsOrdering] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const navigate = useNavigate()

  const optionsFor = (producerId: string) => options[producerId] ?? DEFAULT_OPTIONS
  const changeOptions = (producerId: string, patch: Partial<CheckoutOptions>) =>
    setOptions((all) => ({ ...all, [producerId]: { ...(all[producerId] ?? DEFAULT_OPTIONS), ...patch } }))

  const handleOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cart' } })
      return
    }
    setIsOrdering(true)
    setErrors([])
    const createdIds: string[] = []
    const failures: string[] = []
    for (const group of groups) {
      try {
        const { data } = await ordersService.create(toOrderPayload(group, optionsFor(group.producerId)))
        createdIds.push(data.id)
        removeProducer(group.producerId)
      } catch (err) {
        failures.push(`${group.producerName} : ${apiErrorMessage(err, 'commande refusée')}`)
      }
    }
    setIsOrdering(false)

    if (failures.length > 0) {
      const createdNotice = createdIds.length > 0
        ? [`${createdIds.length} commande(s) créée(s) : retrouvez-les dans « Mes commandes » pour les payer.`]
        : []
      setErrors([...failures, ...createdNotice])
      return
    }
    if (createdIds.length === 1) navigate(`/checkout/${createdIds[0]}`)
    else navigate('/orders', { state: { createdOrderCount: createdIds.length } })
  }

  if (groups.length === 0) {
    return (
      <MainLayout title="Panier">
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
          <div aria-hidden="true" style={{ fontSize: 64, marginBottom: 'var(--space-4)' }}>🛒</div>
          <h1 className="tp-page-title">Votre panier est vide</h1>
          {errors.length > 0 && <ErrorList errors={errors} />}
          <Link to="/products">Découvrir les produits →</Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Panier">
      <h1 className="tp-page-title">Mon panier</h1>
      {groups.length > 1 && (
        <p className="tp-alert tp-alert--info">
          Votre panier contient des produits de {groups.length} producteurs : une commande sera créée par producteur.
        </p>
      )}

      <form className="tp-split" onSubmit={handleOrder}>
        <div className="tp-stack">
          {groups.map((group) => (
            <section key={group.producerId} className="tp-card" aria-labelledby={`producteur-${group.producerId}`}>
              <div className="tp-page-header" style={{ marginBottom: 'var(--space-2)' }}>
                <h2 id={`producteur-${group.producerId}`} style={{ fontSize: 'var(--text-xl)' }}>
                  <Link to={`/producers/${group.producerId}`}>{group.producerName}</Link>
                </h2>
                <Button variant="ghost" size="sm" onClick={() => removeProducer(group.producerId)}>
                  Retirer ces produits
                </Button>
              </div>

              {group.items.map((item) => (
                <CartLine key={item.product.id} item={item} onQuantityChange={updateQty} onRemove={remove} />
              ))}

              <DeliveryOptionsFields
                idPrefix={group.producerId}
                options={optionsFor(group.producerId)}
                onChange={(patch) => changeOptions(group.producerId, patch)}
              />

              <p style={{ textAlign: 'right', fontWeight: 700 }}>Sous-total : {formatPrice(group.subtotal)}</p>
            </section>
          ))}
        </div>

        <aside className="tp-card" aria-labelledby="recapitulatif" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h2 id="recapitulatif" style={{ marginBottom: 'var(--space-4)' }}>Récapitulatif</h2>
          <div className="tp-small tp-muted" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span>{count} article{count > 1 ? 's' : ''}</span>
            <span>{groups.length} commande{groups.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'var(--text-xl)', marginBottom: 'var(--space-5)' }}>
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          {errors.length > 0 && <ErrorList errors={errors} />}

          <Button type="submit" variant="secondary" size="lg" className="tp-btn--block" loading={isOrdering}>
            {groups.length > 1 ? `Passer les ${groups.length} commandes` : 'Commander'}
          </Button>
          {!isAuthenticated && (
            <p className="tp-small tp-muted" style={{ marginTop: 'var(--space-3)' }}>
              Vous serez invité à vous connecter ; votre panier est conservé.
            </p>
          )}
        </aside>
      </form>
    </MainLayout>
  )
}
