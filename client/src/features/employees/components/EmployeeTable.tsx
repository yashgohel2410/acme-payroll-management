import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable, type DataTableStateEvent } from 'primereact/datatable'
import { Link } from 'react-router-dom'
import { formatCurrentSalary, formatEmployeeName, formatEmploymentStatus } from '../formatEmployee.ts'
import type { EmployeeSortField, EmployeeSortOrder, ListedEmployee } from '../types.ts'

type EmployeeTableProps = {
  employees: readonly ListedEmployee[]
  loading: boolean
  page: number
  limit: number
  total: number
  sortBy: EmployeeSortField
  sortOrder: EmployeeSortOrder
  emptyMessage: string
  deactivatingId: number | null
  onPageChange: (page: number, limit: number) => void
  onSortChange: (sortBy: EmployeeSortField, sortOrder: EmployeeSortOrder) => void
  onDeactivate: (employee: ListedEmployee) => void
}

const pageSizes = [10, 20, 50, 100]

function isSortField(value: string): value is EmployeeSortField {
  return (
    value === 'employeeCode' ||
    value === 'firstName' ||
    value === 'lastName' ||
    value === 'email' ||
    value === 'dateOfJoining' ||
    value === 'designation' ||
    value === 'employmentStatus'
  )
}

export function EmployeeTable({
  employees,
  loading,
  page,
  limit,
  total,
  sortBy,
  sortOrder,
  emptyMessage,
  deactivatingId,
  onPageChange,
  onSortChange,
  onDeactivate,
}: EmployeeTableProps) {
  function handlePage(event: DataTableStateEvent) {
    const nextLimit = event.rows
    const nextPage = event.page === undefined ? 1 : event.page + 1
    onPageChange(nextPage, nextLimit)
  }

  function handleSort(event: DataTableStateEvent) {
    if (typeof event.sortField !== 'string' || !isSortField(event.sortField)) {
      return
    }

    onSortChange(event.sortField, event.sortOrder === -1 ? 'desc' : 'asc')
  }

  return (
    <DataTable
      value={[...employees]}
      dataKey="id"
      lazy
      paginator
      rows={limit}
      first={(page - 1) * limit}
      totalRecords={total}
      rowsPerPageOptions={pageSizes}
      onPage={handlePage}
      sortField={sortBy}
      sortOrder={sortOrder === 'asc' ? 1 : -1}
      onSort={handleSort}
      loading={loading}
      removableSort={false}
      emptyMessage={emptyMessage}
      responsiveLayout="scroll"
      size="small"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      currentPageReportTemplate="{first}–{last} of {totalRecords}"
    >
      <Column field="employeeCode" header="Employee code" sortable />
      <Column
        header="Employee name"
        sortField="lastName"
        sortable
        body={(employee: ListedEmployee) => formatEmployeeName(employee.firstName, employee.lastName)}
      />
      <Column field="email" header="Email" sortable />
      <Column field="designation" header="Designation" sortable />
      <Column header="Department" body={(employee: ListedEmployee) => employee.department.name} />
      <Column
        header="Country"
        body={(employee: ListedEmployee) => `${employee.country.name} (${employee.country.isoCode})`}
      />
      <Column
        field="employmentStatus"
        header="Employment status"
        sortable
        body={(employee: ListedEmployee) => (
          <span className={`employee-status employee-status--${employee.employmentStatus.toLowerCase()}`}>
            {formatEmploymentStatus(employee.employmentStatus)}
          </span>
        )}
      />
      <Column header="Current salary" body={(employee: ListedEmployee) => formatCurrentSalary(employee.currentSalary)} />
      <Column
        header="Actions"
        body={(employee: ListedEmployee) => (
          <div className="employee-table__actions">
            <Link className="employee-table__action" to={`/employees/${employee.id}`}>
              Details
            </Link>
            <Button
              type="button"
              label="Deactivate"
              icon="pi pi-ban"
              text
              severity="danger"
              size="small"
              disabled={employee.employmentStatus === 'INACTIVE' || deactivatingId !== null}
              onClick={() => onDeactivate(employee)}
            />
          </div>
        )}
      />
    </DataTable>
  )
}
