import { CATEGORY_LABELS, type ProductCategory } from './catalog'

describe('libellés des catégories', () => {
  it('donne un libellé français à chaque catégorie de la spec, identique à celui de l\'API', () => {
    const specCategories: ProductCategory[] = [
      'FRUITS_VEGETABLES', 'DAIRY', 'MEAT', 'BEVERAGES', 'FINE_GROCERY', 'CRAFTS', 'FLOWERS_PLANTS', 'OTHER',
    ]
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...specCategories].sort())
    expect(CATEGORY_LABELS.FRUITS_VEGETABLES).toBe('Fruits & Légumes')
    expect(CATEGORY_LABELS.FINE_GROCERY).toBe('Épicerie fine')
    // Aucun code brut (FRUITS_VEGETABLES…) n'est affiché
    expect(Object.values(CATEGORY_LABELS).some((label) => /^[A-Z_]+$/.test(label))).toBe(false)
  })
})
