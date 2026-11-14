import { Button } from 'primereact/button'
import { useEffect, useState } from 'react'
import { RecentRevisionsTable } from '../../dashboard/components/RecentRevisionsTable.tsx'
import type { RecentRevision } from '../../dashboard/types.ts'
import { loadRecentSalaryRevisions, readSalaryError } from '../services/salaryApi.ts'
import '../../dashboard/dashboard.css'
import '../../employees/employees.css'

export function SalaryHistoryPage() {
  const [revisions, setRevisions] = useState<RecentRevision[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    loadRecentSalaryRevisions()
      .then((next) => {
        if (active) {
          setRevisions(next)
          setLoading(false)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setRevisions(null)
          setError(readSalaryError(reason))
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  return (
    <section className="employee-page salary-page">
      <header className="employee-page__header">
        <div>
          <p className="page__eyebrow">HR Manager</p>
          <h1>Salary history</h1>
          <p>The latest salary revisions across the company. Open an employee profile for that person’s full history.</p>
        </div>
      </header>

      {loading ? (
        <div className="employee-page__loading" role="status" aria-label="Loading salary history">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        </div>
      ) : null}

      {error !== null ? (
        <div className="employee-page__error" role="alert">
          <p>{error}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setReloadKey((value) => value + 1)} />
        </div>
      ) : null}

      {revisions !== null && error === null ? <RecentRevisionsTable revisions={revisions} /> : null}
    </section>
  )
}
