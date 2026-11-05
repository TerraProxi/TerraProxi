import { useState } from 'react'
import { MainLayout } from '../../components/layout/MainLayout'
import { AdminStatsCards } from '../../components/admin/AdminStatsCards'
import { AdminUsersTable } from '../../components/admin/AdminUsersTable'
import { ProducersToVerify } from '../../components/admin/ProducersToVerify'

/** Back-office administrateur : indicateurs, comptes, vérification des producteurs (specs/api/admin-api.yaml). */
export function AdminPage() {
  // Une suspension ou une vérification modifie les indicateurs : on les recharge
  const [statsKey, setStatsKey] = useState(0)
  const refreshStats = () => setStatsKey((k) => k + 1)

  return (
    <MainLayout title="Administration">
      <h1 className="tp-page-title">Administration</h1>
      <div className="tp-stack" style={{ gap: 'var(--space-8)' }}>
        <section aria-labelledby="titre-indicateurs">
          <h2 id="titre-indicateurs" className="tp-section-title" style={{ fontSize: 'var(--text-xl)' }}>Indicateurs</h2>
          <AdminStatsCards refreshKey={statsKey} />
        </section>
        <ProducersToVerify onChanged={refreshStats} />
        <AdminUsersTable onChanged={refreshStats} />
      </div>
    </MainLayout>
  )
}
