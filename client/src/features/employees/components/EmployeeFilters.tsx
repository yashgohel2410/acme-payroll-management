import { Button } from 'primereact/button'
import { Dropdown, type DropdownChangeEvent } from 'primereact/dropdown'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { employmentStatuses, type EmploymentStatus, type NamedOption } from '../types.ts'
import { formatEmploymentStatus } from '../formatEmployee.ts'

type EmployeeFiltersProps = {
  search: string
  departmentId: number | null
  countryId: number | null
  employmentStatus: EmploymentStatus | null
  departments: readonly NamedOption[]
  countries: readonly NamedOption[]
  onSearchChange: (value: string) => void
  onDepartmentChange: (value: number | null) => void
  onCountryChange: (value: number | null) => void
  onStatusChange: (value: EmploymentStatus | null) => void
  onClear: () => void
}

const statusOptions = employmentStatuses.map((status) => ({
  value: status,
  label: formatEmploymentStatus(status),
}))

function readId(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function readStatus(value: unknown): EmploymentStatus | null {
  if (typeof value !== 'string') {
    return null
  }

  return employmentStatuses.find((status) => status === value) ?? null
}

export function EmployeeFilters({
  search,
  departmentId,
  countryId,
  employmentStatus,
  departments,
  countries,
  onSearchChange,
  onDepartmentChange,
  onCountryChange,
  onStatusChange,
  onClear,
}: EmployeeFiltersProps) {
  return (
    <div className="employee-filters">
      <IconField iconPosition="left" className="employee-filters__search">
        <InputIcon className="pi pi-search" />
        <InputText
          value={search}
          placeholder="Search code, name, or email"
          aria-label="Search employees"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </IconField>
      <Dropdown
        key={departmentId ?? 'all-departments'}
        value={departmentId}
        options={[...departments]}
        optionLabel="name"
        optionValue="id"
        placeholder="All departments"
        aria-label="Department"
        showClear
        onChange={(event: DropdownChangeEvent) => onDepartmentChange(readId(event.value))}
      />
      <Dropdown
        key={countryId ?? 'all-countries'}
        value={countryId}
        options={[...countries]}
        optionLabel="name"
        optionValue="id"
        placeholder="All countries"
        aria-label="Country"
        showClear
        onChange={(event: DropdownChangeEvent) => onCountryChange(readId(event.value))}
      />
      <Dropdown
        key={employmentStatus ?? 'all-statuses'}
        value={employmentStatus}
        options={statusOptions}
        optionLabel="label"
        optionValue="value"
        placeholder="All statuses"
        aria-label="Employment status"
        showClear
        onChange={(event: DropdownChangeEvent) => onStatusChange(readStatus(event.value))}
      />
      <Button type="button" label="Clear filters" icon="pi pi-filter-slash" outlined onClick={onClear} />
    </div>
  )
}
