import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '../../components/layout/MainLayout'
import { CATEGORY_LABELS, productsService, toProductInput, type Product } from '../../services/products.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { formatPrice } from '../../utils/format'

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))

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
  const [error, setError] = useState<string | null>(null)
  const [hasProfile, setHasProfile] = useState(true)

  const load = () => productsService.mine()
    .then(({ data }) => setProducts(data))
    .catch((err) => {
      if (apiErrorStatus(err) === 404) setHasProfile(false)
      else setError(apiErrorMessage(err, 'Impossible de charger le catalogue'))
    })
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const edit = (patch: Partial<Product>) => setEditing((f) => ({ ...f, ...patch }))

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const input = toProductInput(editing)
    if (!input.name) {
      setError('Le nom du produit est obligatoire')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editing.id) await productsService.update(editing.id, input)
      else await productsService.create(input)
      setEditing(null)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Enregistrement impossible'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Supprimer « ${product.name} » ?`)) return
    try {
      await productsService.delete(product.id)
      setProducts((p) => p.filter((x) => x.id !== product.id))
    } catch (err) {
      setError(apiErrorMessage(err, 'Suppression impossible'))
    }
  }

  if (!loading && !hasProfile) {
    return (
      <MainLayout title="Mon catalogue">
        <h1 className="tp-page-title">Mon catalogue</h1>
        <p style={{ marginBottom: 'var(--space-4)' }}>Créez d'abord votre fiche producteur : elle rend vos produits visibles sur la carte.</p>
        <Link to="/producer/profile" style={{ fontWeight: 700 }}>Créer ma fiche producteur →</Link>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Mon catalogue">
      <div className="tp-page-header">
        <h1 className="tp-page-title">Mon catalogue</h1>
        <Button variant="secondary" onClick={() => setEditing({ ...empty })}>+ Ajouter un produit</Button>
      </div>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

      {editing && (
        <form className="tp-card" onSubmit={handleSave} aria-labelledby="titre-formulaire-produit" style={{ marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-md)' }}>
          <h2 id="titre-formulaire-produit" style={{ marginBottom: 'var(--space-5)' }}>
            {editing.id ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>

          <div className="tp-grid-2">
            <Input label="Nom *" id="produit-nom" required value={editing.name ?? ''} onChange={(e) => edit({ name: e.target.value })} />
            <div className="tp-field">
              <label htmlFor="produit-categorie" className="tp-label">Catégorie</label>
              <select id="produit-categorie" className="tp-input" value={editing.category ?? 'OTHER'} onChange={(e) => edit({ category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <Input label="Prix (€) *" id="produit-prix" type="number" min="0" step="0.01" required
              value={editing.price ?? 0} onChange={(e) => edit({ price: Number(e.target.value) })} />
            <Input label="Stock" id="produit-stock" type="number" min="0" step="1"
              value={editing.stock ?? 0} onChange={(e) => edit({ stock: Number(e.target.value) })} />
            <Input label="Unité" id="produit-unite" value={editing.unit ?? 'unité'} onChange={(e) => edit({ unit: e.target.value })} />
            <Input label="URL de l'image" id="produit-image" type="url" value={editing.image_url ?? ''} onChange={(e) => edit({ image_url: e.target.value })} />
          </div>

          <div className="tp-field">
            <label htmlFor="produit-description" className="tp-label">Description</label>
            <textarea id="produit-description" className="tp-input" rows={3} value={editing.description ?? ''}
              onChange={(e) => edit({ description: e.target.value })} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input id="produit-disponible" type="checkbox" style={{ width: 20, height: 20 }} checked={editing.is_available ?? true}
              onChange={(e) => edit({ is_available: e.target.checked })} />
            <label htmlFor="produit-disponible" className="tp-label">Disponible à la vente</label>
          </div>

          <div className="tp-cluster">
            <Button type="submit" variant="secondary" loading={saving}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : products.length === 0 ? (
        <p className="tp-muted">Aucun produit. Ajoutez votre premier produit !</p>
      ) : (
        <div className="tp-product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
          {products.map((p) => (
            <article key={p.id} className="tp-card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h2 style={{ fontSize: 'var(--text-base)' }}>{p.name}</h2>
                <Badge variant={p.is_available && p.stock > 0 ? 'success' : 'neutral'} label={p.is_available && p.stock > 0 ? 'En vente' : 'Indisponible'} />
              </div>
              <p className="tp-small tp-muted">
                {formatPrice(p.price)} / {p.unit} — Stock : {p.stock}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={() => setEditing(p)}>
                  Modifier<span className="sr-only"> {p.name}</span>
                </Button>
                <Button variant="danger-ghost" size="sm" aria-label={`Supprimer ${p.name}`} onClick={() => handleDelete(p)}>
                  <span aria-hidden="true">✕</span>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </MainLayout>
  )
}
