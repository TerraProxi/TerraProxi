import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header
      style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 'var(--text-xl)',
            color: 'var(--color-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          🌱 TerraProxi
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <Link to="/map" style={{ color: 'var(--color-dark)', fontWeight: 500 }}>
            Carte
          </Link>
          <Link to="/products" style={{ color: 'var(--color-dark)', fontWeight: 500 }}>
            Produits
          </Link>

          {isAuthenticated ? (
            <>
              {user?.role === 'PRODUCER' && (
                <Link
                  to="/producer/dashboard"
                  style={{ color: 'var(--color-secondary)', fontWeight: 600 }}
                >
                  Mon espace
                </Link>
              )}
              <Link
                to="/cart"
                style={{ position: 'relative', color: 'var(--color-dark)' }}
              >
                🛒
                {count > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -8,
                      background: 'var(--color-primary)',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </Link>
              <Link
                to="/orders"
                style={{ color: 'var(--color-dark)', fontWeight: 500 }}
              >
                Commandes
              </Link>
              <Link
                to="/messages"
                style={{ color: 'var(--color-dark)', fontWeight: 500 }}
              >
                Messages
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.375rem 0.875rem',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--color-dark)', fontWeight: 500 }}>
                Connexion
              </Link>
              <Link
                to="/register"
                style={{
                  background: 'var(--color-secondary)',
                  color: '#fff',
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                }}
              >
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
