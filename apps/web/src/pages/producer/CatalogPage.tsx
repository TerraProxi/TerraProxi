import { useEffect, useState } from 'react'
import { MainLayout } from '../../components/layout/MainLayout'
import { productsService, type Product } from '../../services/products.service'
import { Badge } from '../../components/ui/Badge'

const CATEGORIES = [
  { value: 'FRUITS_VEGETABLES', label: '🥦 Fruits & Légumes' },
  { value: 'DAIRY',             label: '🧀 Produits laitiers' },
  { value: 'MEAT',              label: '🥩 Viandes' },
  { value: 'BEVERAGES',         label: '🍷 Boissons' },
  { value: 'FINE_GROCERY',      label: '🍯 Épicerie fine' },
  { value: 'CRAFTS',            label: '🎨 Artisanat' },
  { value: 'FLOWERS_PLANTS',    label: '🌸 Fleurs & Plantes' },
  { value: 'OTHER',             label: '📦 Autre' },
]

const empty: Omit<Product, 'id' | 'created_at' | 'producer_name'> = {
  producer_id: '',
  name: '',
  description: '',
  price: 0,
  stock: 0,
  unit: 'unité',
  category: 'OTHER',
  is_available: true,
}

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Product> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => productsService.list().then(({ data }) => setProducts(data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      if (editing.id) {
        await productsService.update(editing.id, editing)
      } else {
        await productsService.create(editing as Omit<Product, 'id' | 'created_at' | 'producer_name'>)
      }
      setEditing(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    await productsService.delete(id)
    setProducts((p) => p.filter((x) => x.id !== id))
  }

  const fieldStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    marginTop: 4,
  }

  return (
    <MainLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)' }}>Mon catalogue</h1>
        <button
          onClick={() => setEditing({ ...empty })}
          style={{ background: 'var(--color-secondary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.625rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          + Ajouter un produit
        </button>
      </div>

      {/* Formulaire */}
      {editing && (
        <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-5)' }}>
            {editing.id ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Nom *</label>
              <input style={fieldStyle} value={editing.name ?? ''} onChange={(e) => setEditing((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Catégorie</label>
              <select style={fieldStyle} value={editing.category ?? 'OTHER'} onChange={(e) => setEditing((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Prix (€) *</label>
              <input type="number" min="0" step="0.01" style={fieldStyle} value={editing.price ?? 0} onChange={(e) => setEditing((f) => ({ ...f, price: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Stock</label>
              <input type="number" min="0" style={fieldStyle} value={editing.stock ?? 0} onChange={(e) => setEditing((f) => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Unité</label>
              <input style={fieldStyle} value={editing.unit ?? 'unité'} onChange={(e) => setEditing((f) => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>URL de l'image</label>
              <input style={fieldStyle} value={editing.image_url ?? ''} onChange={(e) => setEditing((f) => ({ ...f, image_url: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Description</label>
            <textarea style={{ ...fieldStyle, height: 80, resize: 'vertical' }} value={editing.description ?? ''} onChange={(e) => setEditing((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={editing.is_available ?? true} onChange={(e) => setEditing((f) => ({ ...f, is_available: e.target.checked }))} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Disponible à la vente</span>
          </label>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: 'var(--color-secondary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.625rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => setEditing(null)} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.625rem 1.25rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <p>Chargement…</p>
      ) : products.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Aucun produit. Ajoutez votre premier produit !</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {products.map((p) => (
            <div key={p.id} style={{ background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong style={{ fontFamily: 'var(--font-heading)' }}>{p.name}</strong>
                <Badge variant={p.is_available && p.stock > 0 ? 'success' : 'neutral'} label={p.is_available && p.stock > 0 ? 'En vente' : 'Indisponible'} />
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {Number(p.price).toFixed(2)} € / {p.unit} — Stock : {p.stock}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button onClick={() => setEditing(p)} style={{ flex: 1, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.4rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  Modifier
                </button>
                <button onClick={() => handleDelete(p.id)} style={{ background: '#FEE2E2', color: 'var(--color-danger)', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  )
}
