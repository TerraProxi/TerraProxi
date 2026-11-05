import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { NotificationBell } from './NotificationBell'

const NAV_ID = 'navigation-principale'

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const { count } = useCart()
  const unread = useUnreadMessages(isAuthenticated)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const isProducer = user?.role === 'PRODUCER'
  const isAdmin = user?.role === 'ADMIN'
  // Visiteurs et consommateurs achètent ; producteurs et administrateurs ont leur propre espace
  const canShop = !user || user.role === 'CONSUMER'

  // Le menu mobile se referme à chaque changement de page
  useEffect(() => { setIsMenuOpen(false) }, [pathname])

  // Échap referme le menu et rend le focus au bouton ; à l'ouverture, focus sur le premier lien
  useEffect(() => {
    if (!isMenuOpen) return
    navRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setIsMenuOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="tp-header">
      <div className="container tp-header__bar">
        <Link to="/" className="tp-header__logo">
          <span aria-hidden="true">🌱</span> TerraProxi
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className="tp-header__toggle"
          aria-expanded={isMenuOpen}
          aria-controls={NAV_ID}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{isMenuOpen ? '✕' : '☰'}</span>
          Menu
        </button>

        <nav id={NAV_ID} ref={navRef} className="tp-header__nav" data-open={isMenuOpen} aria-label="Navigation principale">
          <NavLink to="/map" className="tp-nav-link">Carte</NavLink>
          <NavLink to="/products" className="tp-nav-link">Produits</NavLink>

          {isProducer && (
            <>
              <NavLink to="/producer/dashboard" className="tp-nav-link">Mon espace</NavLink>
              <NavLink to="/producer/orders" className="tp-nav-link">Commandes reçues</NavLink>
            </>
          )}

          {isAdmin && <NavLink to="/admin" className="tp-nav-link">Administration</NavLink>}

          {canShop && (
            <NavLink to="/cart" className="tp-nav-link">
              <span aria-hidden="true">🛒</span> Panier
              {count > 0 && <span className="tp-nav-badge">{count}<span className="sr-only"> article(s)</span></span>}
            </NavLink>
          )}

          {isAuthenticated ? (
            <>
              {canShop && (
                <>
                  <NavLink to="/orders" className="tp-nav-link">Commandes</NavLink>
                  <NavLink to="/assistant" className="tp-nav-link">Assistant</NavLink>
                </>
              )}
              <NavLink to="/messages" className="tp-nav-link">
                Messages
                {unread > 0 && (
                  <span className="tp-nav-badge tp-nav-badge--alert">
                    {unread}<span className="sr-only"> non lu(s)</span>
                  </span>
                )}
              </NavLink>
              <NotificationBell />
              <NavLink to="/account" className="tp-nav-link">Mon compte</NavLink>
              <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="tp-nav-link">Connexion</NavLink>
              <Link to="/register" className="tp-btn tp-btn--secondary tp-btn--sm">S'inscrire</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
