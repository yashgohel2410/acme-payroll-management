import { Button } from 'primereact/button'
import { Column } from 'primereact/column'
import { DataTable, type DataTableStateEvent } from 'primereact/datatable'
import { Dropdown, type DropdownChangeEvent } from 'primereact/dropdown'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputText } from 'primereact/inputtext'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrentSalary, formatIsoDate } from '../../employees/formatEmployee.ts'
import { loadEmployeeCatalog } from '../../employees/services/employeeApi.ts'
import type { EmployeeCurrency, NamedOption } from '../../employees/types.ts'
import {
  listSalaries,
  readSalaryError,
  type ListedSalary,
  type SalaryListResult,
  type SalarySortField,
  type SalarySortOrder,
} from '../services/salaryApi.ts'
import '../../employees/employees.css'
import '../salaries.css'

const pageSizes = [10, 20, 50, 100]

function isSortField(value: string): value is SalarySortField {
  return value === 'amount' || value === 'effectiveFrom' || value === 'effectiveTo'
}

function formatAmount(salary: ListedSalary): string {
  return formatCurrentSalary({ amount: salary.amount, currency: salary.currency })
}

function readId(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

export function SalariesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [countryId, setCountryId] = useState<number | null>(null)
  const [currencyId, setCurrencyId] = useState<number | null>(null)
  const [effectiveDate, setEffectiveDate] = useState('')
  const [departments, setDepartments] = useState<NamedOption[]>([])
  const [countries, setCountries] = useState<NamedOption[]>([])
  const [currencies, setCurrencies] = useState<EmployeeCurrency[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sortBy, setSortBy] = useState<SalarySortField>('effectiveFrom')
  const [sortOrder, setSortOrder] = useState<SalarySortOrder>('desc')
  const [result, setResult] = useState<SalaryListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    loadEmployeeCatalog()
      .then((options) => {
        if (!active) {
          return
        }
        setDepartments(options.departments)
        setCountries(options.countries)
        setCurrencies(options.currencies)
      })
      .catch(() => {
        if (!active) {
          return
        }
        setDepartments([])
        setCountries([])
        setCurrencies([])
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      setSearch((current) => {
        if (current !== nextSearch) {
          setPage(1)
        }
        return nextSearch
      })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    listSalaries({
      page,
      limit,
      search: search.length > 0 ? search : undefined,
      departmentId: departmentId ?? undefined,
      countryId: countryId ?? undefined,
      currencyId: currencyId ?? undefined,
      effectiveDate: effectiveDate.length > 0 ? effectiveDate : undefined,
      sortBy,
      sortOrder,
    })
      .then((next) => {
        if (active) {
          setResult(next)
          setLoading(false)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(readSalaryError(reason))
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [page, limit, search, departmentId, countryId, currencyId, effectiveDate, sortBy, sortOrder, reloadKey])

  function handlePage(event: DataTableStateEvent) {
    setLimit(event.rows)
    setPage(event.page === undefined ? 1 : event.page + 1)
  }

  function handleSort(event: DataTableStateEvent) {
    if (typeof event.sortField !== 'string' || !isSortField(event.sortField)) {
      return
    }

    setSortBy(event.sortField)
    setSortOrder(event.sortOrder === -1 ? 'desc' : 'asc')
    setPage(1)
  }

  const filtersActive =
    search.length > 0 || departmentId !== null || countryId !== null || currencyId !== null || effectiveDate.length > 0

  return (
    <section className="employee-page salary-page">
      <header className="employee-page__header">
        <div>
          <p className="page__eyebrow">HR Manager</p>
          <h1>Salaries</h1>
          <p>Salary periods for every employee. Search by code, name, or email, and filter by department, country, currency, or a date within the salary period.</p>
        </div>
      </header>

      <div className="salary-page__filters">
        <IconField iconPosition="left" className="employee-filters__search">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchInput}
            placeholder="Search code, name, or email"
            aria-label="Search salaries"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </IconField>
        <Dropdown
          value={departmentId}
          options={departments}
          optionLabel="name"
          optionValue="id"
          placeholder="All departments"
          aria-label="Department"
          showClear
          onChange={(event: DropdownChangeEvent) => {
            setDepartmentId(readId(event.value))
            setPage(1)
          }}
        />
        <Dropdown
          value={countryId}
          options={countries}
          optionLabel="name"
          optionValue="id"
          placeholder="All countries"
          aria-label="Country"
          showClear
          onChange={(event: DropdownChangeEvent) => {
            setCountryId(readId(event.value))
            setPage(1)
          }}
        />
        <Dropdown
          value={currencyId}
          options={currencies}
          optionLabel="code"
          optionValue="id"
          placeholder="All currencies"
          aria-label="Currency"
          showClear
          onChange={(event: DropdownChangeEvent) => {
            setCurrencyId(readId(event.value))
            setPage(1)
          }}
        />
        <InputText
          type="date"
          value={effectiveDate}
          aria-label="Effective date"
          onChange={(event) => {
            setEffectiveDate(event.target.value)
            setPage(1)
          }}
        />
        <Button
          type="button"
          label="Clear filters"
          icon="pi pi-filter-slash"
          outlined
          onClick={() => {
            setSearchInput('')
            setSearch('')
            setDepartmentId(null)
            setCountryId(null)
            setCurrencyId(null)
            setEffectiveDate('')
            setPage(1)
          }}
        />
      </div>

      {error !== null && result === null ? (
        <div className="employee-page__error" role="alert">
          <p>{error}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setReloadKey((value) => value + 1)} />
        </div>
      ) : null}

      {loading && result === null ? (
        <div className="employee-page__loading" role="status" aria-label="Loading salaries">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        </div>
      ) : null}

      {result !== null ? (
        <div className="employee-page__table salary-page__table">
          {error !== null ? (
            <div className="employee-page__error" role="alert">
              <p>{error}</p>
              <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setReloadKey((value) => value + 1)} />
            </div>
          ) : null}
          <DataTable
            value={result.data}
            dataKey="id"
            lazy
            paginator
            rows={limit}
            first={(page - 1) * limit}
            totalRecords={result.meta.totalRecords}
            rowsPerPageOptions={pageSizes}
            onPage={handlePage}
            sortField={sortBy}
            sortOrder={sortOrder === 'asc' ? 1 : -1}
            onSort={handleSort}
            loading={loading}
            removableSort={false}
            emptyMessage={filtersActive ? 'No salaries match these filters.' : 'No salary records are available.'}
            responsiveLayout="scroll"
            size="small"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            currentPageReportTemplate="{first}–{last} of {totalRecords}"
          >
            <Column
              header="Employee"
              body={(salary: ListedSalary) => (
                <Link to={`/employees/${salary.employee.id}`}>
                  {salary.employee.firstName} {salary.employee.lastName}
                </Link>
              )}
            />
            <Column header="Employee code" body={(salary: ListedSalary) => salary.employee.employeeCode} />
            <Column header="Department" body={(salary: ListedSalary) => salary.employee.department.name} />
            <Column
              header="Country"
              body={(salary: ListedSalary) => `${salary.employee.country.name} (${salary.employee.country.isoCode})`}
            />
            <Column field="amount" header="Amount" body={formatAmount} sortable />
            <Column
              field="effectiveFrom"
              header="Effective from"
              body={(salary: ListedSalary) => formatIsoDate(salary.effectiveFrom)}
              sortable
            />
            <Column
              field="effectiveTo"
              header="Effective to"
              body={(salary: ListedSalary) => (salary.effectiveTo === null ? 'Present' : formatIsoDate(salary.effectiveTo))}
              sortable
            />
          </DataTable>
        </div>
      ) : null}
    </section>
  )
}
