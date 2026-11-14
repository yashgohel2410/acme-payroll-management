import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { formatCurrentSalary, formatIsoDate } from '../formatEmployee.ts'
import type { EmployeeSalary } from '../types.ts'

type EmployeeSalaryHistoryProps = {
  salaries: readonly EmployeeSalary[]
}

function formatPeriodEnd(salary: EmployeeSalary): string {
  return salary.effectiveTo === null ? 'Present' : formatIsoDate(salary.effectiveTo)
}

export function EmployeeSalaryHistory({ salaries }: EmployeeSalaryHistoryProps) {
  return (
    <DataTable
      value={[...salaries]}
      dataKey="id"
      size="small"
      emptyMessage="No salary history has been recorded."
      responsiveLayout="scroll"
    >
      <Column header="Effective from" body={(salary: EmployeeSalary) => formatIsoDate(salary.effectiveFrom)} />
      <Column header="Effective to" body={formatPeriodEnd} />
      <Column header="Amount" body={(salary: EmployeeSalary) => formatCurrentSalary(salary)} />
      <Column header="Currency" body={(salary: EmployeeSalary) => `${salary.currency.code} · ${salary.currency.name}`} />
    </DataTable>
  )
}
