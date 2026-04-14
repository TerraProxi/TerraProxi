import type { ReactNode } from 'react'
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
      </footer>
    </div>
  )
}
