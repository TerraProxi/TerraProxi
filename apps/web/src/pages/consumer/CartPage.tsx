import { useNavigate } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { ordersService } from '../../services/orders.service'
import { useState } from 'react'

export function CartPage() {
  const { items, total, producerId, remove, updateQty, clear } = useCart()
  const { isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleOrder = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (!producerId || !items.length) return

    setLoading(true)
    setError('')
    try {
      const { data: order } = await ordersService.create({
        producer_id: producerId,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      })
      clear()
      navigate(`/checkout/${order.id}`)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur lors de la commande')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
          <div style={{ fontSize: 64, marginBottom: 'var(--space-4)' }}>🛒</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-4)' }}>Votre panier est vide</h2>
          <a href="/products" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Découvrir les produits →
          </a>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>
        Mon panier
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)', alignItems: 'start' }}>
        {/* Articles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {items.map(({ product, quantity }) => (
            <div
              key={product.id}
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
                display: 'flex',
                gap: 'var(--space-4)',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-md)',
                  background: product.image_url
                    ? `url(${product.image_url}) center/cover`
                    : 'linear-gradient(135deg, var(--color-light-bg), var(--color-border))',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                {!product.image_url && '🌿'}
              </div>

              <div style={{ flex: 1 }}>
                <strong style={{ fontFamily: 'var(--font-heading)' }}>{product.name}</strong>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {Number(product.price).toFixed(2)} € / {product.unit}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => updateQty(product.id, quantity - 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                <button onClick={() => updateQty(product.id, quantity + 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>+</button>
              </div>

              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, minWidth: 64, textAlign: 'right' }}>
                {(Number(product.price) * quantity).toFixed(2)} €
              </div>

              <button onClick={() => remove(product.id)} style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Récapitulatif */}
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)' }}>Récapitulatif</h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            <span>{items.length} article{items.length > 1 ? 's' : ''}</span>
            <span>{total.toFixed(2)} €</span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'var(--text-xl)', marginBottom: 'var(--space-5)' }}>
            <span>Total</span>
            <span>{total.toFixed(2)} €</span>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', color: 'var(--color-danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleOrder}
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--color-secondary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 'var(--text-base)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Commande en cours…' : 'Commander →'}
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
