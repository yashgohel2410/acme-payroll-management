import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import type { RecentRevision, RevisionCurrency } from '../types.ts'

type RevisionRow = {
  id: number
  employeeName: string
  employeeCode: string
  previousSalary: string
  updatedSalary: string
  currency: string
  revisionDate: string
}

function formatSalaryAmount(amount: number, currency: RevisionCurrency): string {
  const digits = currency.minorUnitDigits
  if (!Number.isInteger(digits) || digits < 0 || digits > 8) {
    return `${amount.toLocaleString('en-US')} ${currency.code}`
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount / 10 ** digits)
  } catch {
    return `${amount.toLocaleString('en-US')} ${currency.code}`
  }
}

function formatRevisionDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function toRow(revision: RecentRevision): RevisionRow {
  const previousCode = revision.previousCurrency.code
  const updatedCode = revision.updatedCurrency.code

  return {
    id: revision.id,
    employeeName: `${revision.employee.firstName} ${revision.employee.lastName}`,
    employeeCode: revision.employee.employeeCode,
    previousSalary: formatSalaryAmount(revision.previousAmount, revision.previousCurrency),
    updatedSalary: formatSalaryAmount(revision.updatedAmount, revision.updatedCurrency),
    currency: previousCode === updatedCode ? previousCode : `${previousCode} → ${updatedCode}`,
    revisionDate: formatRevisionDate(revision.changedAt),
  }
}

type RecentRevisionsTableProps = {
  revisions: readonly RecentRevision[]
}

export function RecentRevisionsTable({ revisions }: RecentRevisionsTableProps) {
  const rows = revisions.map(toRow)

  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel__header">
        <h2>Recent salary revisions</h2>
        <p>Latest changes, including employees who are no longer active. Amounts keep their own currency.</p>
      </header>
      <DataTable
        value={rows}
        dataKey="id"
        emptyMessage="No salary revisions have been recorded."
        responsiveLayout="scroll"
        size="small"
      >
        <Column field="employeeName" header="Employee" />
        <Column field="employeeCode" header="Employee code" />
        <Column field="previousSalary" header="Previous salary" />
        <Column field="updatedSalary" header="Updated salary" />
        <Column field="currency" header="Currency" />
        <Column field="revisionDate" header="Revision date" />
      </DataTable>
    </article>
  )
}
