import { Button } from 'primereact/button'
import { useState } from 'react'
import { KpiCard } from '../../dashboard/components/KpiCard.tsx'
import '../../dashboard/dashboard.css'
import { CountryDistributionChart } from '../components/CountryDistributionChart.tsx'
import { DepartmentDistributionChart } from '../components/DepartmentDistributionChart.tsx'
import { SalaryDistributionChart } from '../components/SalaryDistributionChart.tsx'
import { useAnalytics } from '../useAnalytics.ts'
import type { AnalyticsData } from '../types.ts'
import '../analytics.css'

function AnalyticsContent({ data }: { data: AnalyticsData }) {
  const { summary } = data

  return (
    <>
      <div className="dashboard__kpis">
        <KpiCard label="Total employees" value={summary.totalEmployees} hint="All employment statuses" icon="pi pi-users" />
        <KpiCard label="Active employees" value={summary.activeEmployees} hint="Status ACTIVE" icon="pi pi-check-circle" />
        <KpiCard label="Inactive employees" value={summary.inactiveEmployees} hint="Status INACTIVE" icon="pi pi-minus-circle" />
        <KpiCard label="Total departments" value={summary.totalDepartments} hint="Organizational units" icon="pi pi-sitemap" />
        <KpiCard label="Total countries" value={summary.totalCountries} hint="Assigned locations" icon="pi pi-globe" />
      </div>
      <div className="dashboard__charts">
        <DepartmentDistributionChart departments={data.departments} />
        <CountryDistributionChart countries={data.countries} />
      </div>
      <SalaryDistributionChart salaries={data.salaries} />
    </>
  )
}

export function AnalyticsPage() {
  const [requestId, setRequestId] = useState(0)
  const analytics = useAnalytics(requestId)

  return (
    <section className="dashboard analytics">
      <header className="dashboard__intro">
        <p className="page__eyebrow">HR Manager</p>
        <h1>Analytics</h1>
        <p>Workforce totals, where people work, and current salary totals by currency.</p>
      </header>

      {analytics.status === 'loading' ? (
        <p className="dashboard-status" role="status">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
          Loading analytics
        </p>
      ) : null}

      {analytics.status === 'error' ? (
        <div className="dashboard-status dashboard-status--error" role="alert">
          <p>{analytics.message}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setRequestId((value) => value + 1)} />
        </div>
      ) : null}

      {analytics.status === 'ready' ? <AnalyticsContent data={analytics.data} /> : null}
    </section>
  )
}
