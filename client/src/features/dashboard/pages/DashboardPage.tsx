import { Button } from 'primereact/button'
import { useState } from 'react'
import { DistributionChart } from '../components/DistributionChart.tsx'
import { KpiCard } from '../components/KpiCard.tsx'
import { RecentRevisionsTable } from '../components/RecentRevisionsTable.tsx'
import { useDashboard } from '../useDashboard.ts'
import type { DashboardData } from '../types.ts'
import '../dashboard.css'

function DashboardContent({ data }: { data: DashboardData }) {
  const { summary } = data

  return (
    <>
      <div className="dashboard__kpis">
        <KpiCard label="Total employees" value={summary.totalEmployees} hint="All employment statuses" icon="pi pi-users" />
        <KpiCard label="Active employees" value={summary.activeEmployees} hint="Status ACTIVE" icon="pi pi-check-circle" />
        <KpiCard label="Inactive employees" value={summary.inactiveEmployees} hint="Status INACTIVE" icon="pi pi-minus-circle" />
        <KpiCard label="Departments" value={summary.totalDepartments} hint="Organizational units" icon="pi pi-sitemap" />
        <KpiCard label="Countries" value={summary.totalCountries} hint="Assigned locations" icon="pi pi-globe" />
        <KpiCard
          label="Recent salary revisions"
          value={summary.salaryRevisionsLast30Days}
          hint="Last 30 days"
          icon="pi pi-history"
        />
      </div>
      <div className="dashboard__charts">
        <DistributionChart
          title="Employees by department"
          description="Active employees in each department. Departments with none are included."
          points={data.departments.map((department) => ({
            label: department.name,
            value: department.employeeCount,
            caption: 'Active employees',
          }))}
          emptyMessage="No departments have been created."
          valueName="Active employees"
          compactAxis={false}
        />
        <DistributionChart
          title="Employees by country"
          description="Active employees in each country. Countries with none are included."
          points={data.countries.map((country) => ({
            label: country.name,
            value: country.employeeCount,
            caption: `${country.isoCode} · active employees`,
          }))}
          emptyMessage="No countries have been created."
          valueName="Active employees"
          compactAxis={false}
        />
      </div>
      <DistributionChart
        title="Salary distribution by currency"
        description="Current salary totals for employees who are not inactive. Each currency is shown separately and amounts stay in minor units."
        points={data.salaries.map((salary) => ({
          label: salary.code,
          value: salary.totalAmount,
          caption: `${salary.employeeCount.toLocaleString('en-US')} employees · minor units`,
        }))}
        emptyMessage="No current salaries are available."
        valueName="Total minor units"
        compactAxis
      />
      <RecentRevisionsTable revisions={data.revisions} />
    </>
  )
}

export function DashboardPage() {
  const [requestId, setRequestId] = useState(0)
  const dashboard = useDashboard(requestId)

  return (
    <section className="dashboard">
      <header className="dashboard__intro">
        <p className="page__eyebrow">HR Manager</p>
        <h1>Dashboard</h1>
        <p>Headcount, current salaries, and the latest compensation changes.</p>
      </header>

      {dashboard.status === 'loading' ? (
        <p className="dashboard-status" role="status">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
          Loading dashboard
        </p>
      ) : null}

      {dashboard.status === 'error' ? (
        <div className="dashboard-status dashboard-status--error" role="alert">
          <p>{dashboard.message}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setRequestId((value) => value + 1)} />
        </div>
      ) : null}

      {dashboard.status === 'ready' ? <DashboardContent data={dashboard.data} /> : null}
    </section>
  )
}
