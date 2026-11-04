import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Header } from './Header'

interface Props {
  children: ReactNode
  fullWidth?: boolean
}

export function MainLayout({ children, fullWidth = false }: Props) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>
        {fullWidth ? children : <div className="container" style={{ padding: 'var(--space-8) var(--space-6)' }}>{children}</div>}
      </main>
      <footer
        style={{
          background: 'var(--color-dark)',
          color: '#fff',
          textAlign: 'center',
          padding: 'var(--space-6)',
          fontSize: 'var(--text-sm)',
          opacity: 0.9,
        }}
      >
        © {new Date().getFullYear()} TerraProxi — Produits locaux, liens directs.
        <nav aria-label="Informations légales" style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
          <Link to="/legal" style={{ color: '#fff', textDecoration: 'underline' }}>Mentions légales</Link>
          <Link to="/privacy" style={{ color: '#fff', textDecoration: 'underline' }}>Confidentialité</Link>
        </nav>
      </footer>
    </div>
  )
}
