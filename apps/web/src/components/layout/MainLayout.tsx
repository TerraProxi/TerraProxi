import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Header } from './Header'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

interface Props {
  /** Titre de l'onglet (suffixé par « · TerraProxi »). */
  title: string
  children: ReactNode
  fullWidth?: boolean
}

const MAIN_ID = 'contenu'

export function MainLayout({ title, children, fullWidth = false }: Props) {
  useDocumentTitle(title)

  return (
    <div className="tp-app">
      <a href={`#${MAIN_ID}`} className="tp-skip-link">Aller au contenu</a>
      <Header />
      <main id={MAIN_ID} className="tp-main" tabIndex={-1}>
        {fullWidth ? children : <div className="container tp-page">{children}</div>}
      </main>
      <footer className="tp-footer">
        © {new Date().getFullYear()} TerraProxi — Produits locaux, liens directs.
        <nav aria-label="Informations légales">
          <Link to="/legal">Mentions légales</Link>
          <Link to="/privacy">Confidentialité</Link>
        </nav>
      </footer>
    </div>
  )
}
