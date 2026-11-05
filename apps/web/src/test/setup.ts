import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/** Instance jsdom exposée par l'environnement de test de Vitest. */
type JsdomGlobal = { jsdom?: { window: Pick<Window, 'localStorage' | 'sessionStorage'> } }

// Node ≥ 22 définit son propre localStorage global (vide sans --localstorage-file), qui masque celui
// de jsdom : on rétablit le stockage du navigateur simulé.
const { jsdom } = globalThis as typeof globalThis & JsdomGlobal
if (jsdom) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, { value: jsdom.window[key], configurable: true, writable: true })
  }
}

// Sans `globals`, Testing Library ne peut pas démonter seul les rendus entre deux tests
afterEach(() => cleanup())
