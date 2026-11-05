import { useEffect } from 'react'

const SITE_NAME = 'TerraProxi'

/** Titre d'onglet propre à chaque page (WCAG 2.4.2). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`
  }, [title])
}
