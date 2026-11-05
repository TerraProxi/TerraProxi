import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { ADMIN_PAGE_SIZE, adminService, type AdminUser } from '../../services/admin.service'
import type { UserRole } from '../../services/auth.service'
import { apiErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  CONSUMER: 'Consommateur',
  PRODUCER: 'Producteur',
  ADMIN: 'Administrateur',
}
const SEARCH_MAX_LENGTH = 100

/** Comptes avec recherche, filtre par rôle et suspension / réactivation (effet immédiat côté API). */
export function AdminUsersTable({ onChanged }: { onChanged: () => void }) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<{ search: string; role: UserRole | '' }>({ search: '', role: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async (offset: number) => {
    setIsLoading(true)
    try {
      const { data } = await adminService.users({
        role: filters.role || undefined,
        search: filters.search || undefined,
        limit: ADMIN_PAGE_SIZE,
        offset,
      })
      setUsers((current) => (offset === 0 ? data : [...current, ...data]))
      setHasMore(data.length === ADMIN_PAGE_SIZE)
      setError(null)
    } catch (err) {
      setError(apiErrorMessage(err, 'Impossible de charger les comptes'))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchPage(0) }, [fetchPage])

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, search: search.trim() }))
  }

  const toggleActive = async (account: AdminUser) => {
    const isSuspending = account.is_active
    const question = isSuspending
      ? `Suspendre le compte de ${account.first_name} ${account.last_name} ? Ses sessions seront coupées immédiatement.`
      : `Réactiver le compte de ${account.first_name} ${account.last_name} ?`
    if (!window.confirm(question)) return
    setPendingId(account.id)
    try {
      const { data } = await adminService.setUserActive(account.id, !isSuspending)
      setUsers((list) => list.map((u) => (u.id === data.id ? data : u)))
      onChanged()
    } catch (err) {
      setError(apiErrorMessage(err, 'Modification impossible'))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="tp-card" aria-labelledby="titre-comptes">
      <h2 id="titre-comptes" style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>Comptes</h2>

      <form role="search" onSubmit={submitSearch} className="tp-cluster" style={{ alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div className="tp-field" style={{ marginBottom: 0, flex: '1 1 220px' }}>
          <label htmlFor="admin-recherche" className="tp-label">Rechercher (email, nom, exploitation)</label>
          <input id="admin-recherche" type="search" className="tp-input" maxLength={SEARCH_MAX_LENGTH}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tp-field" style={{ marginBottom: 0, flex: '0 1 200px' }}>
          <label htmlFor="admin-role" className="tp-label">Rôle</label>
          <select id="admin-role" className="tp-input" value={filters.role}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as UserRole | '' }))}>
            <option value="">Tous</option>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </select>
        </div>
        <Button type="submit" variant="outline">Chercher</Button>
      </form>

      {error && <div className="tp-alert tp-alert--error" role="alert">{error}</div>}

      <div className="tp-table-wrap" aria-busy={isLoading}>
        <table className="tp-table">
          <caption className="sr-only">Comptes utilisateurs, les plus récents d'abord</caption>
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Email</th>
              <th scope="col">Rôle</th>
              <th scope="col">Inscription</th>
              <th scope="col">État</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((account) => {
              const fullName = `${account.first_name} ${account.last_name}`
              return (
                <tr key={account.id}>
                  <th scope="row" style={{ color: 'var(--color-dark)' }}>
                    {fullName}
                    {account.company_name && <span className="tp-small tp-muted" style={{ display: 'block', fontWeight: 400 }}>{account.company_name}</span>}
                  </th>
                  <td style={{ wordBreak: 'break-all' }}>{account.email}</td>
                  <td>{ROLE_LABELS[account.role]}</td>
                  <td>{formatDate(account.created_at, 'd MMM yyyy')}</td>
                  <td>{account.is_active ? <Badge variant="success" label="Actif" /> : <Badge variant="danger" label="Suspendu" />}</td>
                  <td>
                    {account.id !== currentUser?.id && (
                      <Button size="sm" variant={account.is_active ? 'danger-ghost' : 'outline'}
                        loading={pendingId === account.id} onClick={() => toggleActive(account)}>
                        {account.is_active ? 'Suspendre' : 'Réactiver'}<span className="sr-only"> {fullName}</span>
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!isLoading && users.length === 0 && <p className="tp-muted" style={{ marginTop: 'var(--space-3)' }}>Aucun compte trouvé.</p>}
      {hasMore && (
        <Button variant="outline" onClick={() => fetchPage(users.length)} loading={isLoading} style={{ marginTop: 'var(--space-4)' }}>
          Voir plus
        </Button>
      )}
    </section>
  )
}
