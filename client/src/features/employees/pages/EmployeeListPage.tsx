import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { routePaths } from '../../../app/routePaths.ts'
import { DeactivateEmployeeDialog } from '../components/DeactivateEmployeeDialog.tsx'
import { EmployeeFilters } from '../components/EmployeeFilters.tsx'
import { EmployeeTable } from '../components/EmployeeTable.tsx'
import { formatEmployeeName } from '../formatEmployee.ts'
import {
  EmployeeAlreadyInactiveError,
  EmployeeNotFoundError,
  deactivateEmployee,
  listEmployees,
  loadEmployeeFilterOptions,
  readEmployeeError,
} from '../services/employeeApi.ts'
import type {
  EmployeeListResult,
  EmployeeSortField,
  EmployeeSortOrder,
  EmploymentStatus,
  ListedEmployee,
  NamedOption,
} from '../types.ts'
import '../employees.css'

const defaultSort: EmployeeSortField = 'employeeCode'

export function EmployeeListPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [countryId, setCountryId] = useState<number | null>(null)
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | null>(null)
  const [departments, setDepartments] = useState<NamedOption[]>([])
  const [countries, setCountries] = useState<NamedOption[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [sortBy, setSortBy] = useState<EmployeeSortField>(defaultSort)
  const [sortOrder, setSortOrder] = useState<EmployeeSortOrder>('asc')
  const [result, setResult] = useState<EmployeeListResult | null>(null)
  const [resultIsFiltered, setResultIsFiltered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [deactivateTarget, setDeactivateTarget] = useState<ListedEmployee | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useRef<Toast>(null)
  const savingRef = useRef(false)
  const announcedDeactivation = useRef<string | null>(null)

  useEffect(() => {
    const state: unknown = location.state
    const name =
      typeof state === 'object' && state !== null && 'deactivatedEmployee' in state && typeof state.deactivatedEmployee === 'string'
        ? state.deactivatedEmployee
        : null

    if (name === null) {
      announcedDeactivation.current = null
      return
    }

    if (announcedDeactivation.current === name) {
      return
    }

    announcedDeactivation.current = name
    toast.current?.show({
      severity: 'success',
      summary: 'Employee deactivated',
      detail: `${name} is now Deactivated and can no longer be edited.`,
    })
    navigate(routePaths.employees, { replace: true, state: null })
  }, [location.state, navigate])

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

    loadEmployeeFilterOptions()
      .then((options) => {
        if (!active) {
          return
        }
        setDepartments(options.departments)
        setCountries(options.countries)
      })
      .catch(() => {
        if (active) {
          setDepartments([])
          setCountries([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const filtered =
      search.length > 0 || departmentId !== null || countryId !== null || employmentStatus !== null

    listEmployees({
      page,
      limit,
      sortBy,
      sortOrder,
      ...(search.length > 0 ? { search } : {}),
      ...(departmentId !== null ? { departmentId } : {}),
      ...(countryId !== null ? { countryId } : {}),
      ...(employmentStatus !== null ? { employmentStatus } : {}),
    })
      .then((employees) => {
        if (!active) {
          return
        }
        setResult(employees)
        setResultIsFiltered(filtered)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }
        setError(readEmployeeError(reason))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, limit, search, departmentId, countryId, employmentStatus, sortBy, sortOrder, reloadKey])

  function updateFilter(update: () => void) {
    update()
    setPage(1)
  }

  function confirmDeactivate() {
    if (savingRef.current || deactivateTarget === null) {
      return
    }

    const target = deactivateTarget
    savingRef.current = true
    setDeactivating(true)

    deactivateEmployee(String(target.id))
      .then(() => {
        toast.current?.show({
          severity: 'success',
          summary: 'Employee deactivated',
          detail: `${formatEmployeeName(target.firstName, target.lastName)} is now Deactivated and can no longer be edited.`,
        })
        setDeactivateTarget(null)
        setResult(null)
        setLoading(true)
        setReloadKey((value) => value + 1)
      })
      .catch((reason: unknown) => {
        if (reason instanceof EmployeeNotFoundError) {
          toast.current?.show({
            severity: 'error',
            summary: 'Employee not found',
            detail: reason.message,
          })
          setDeactivateTarget(null)
          setReloadKey((value) => value + 1)
          return
        }

        if (reason instanceof EmployeeAlreadyInactiveError) {
          toast.current?.show({
            severity: 'warn',
            summary: 'Already deactivated',
            detail: reason.message,
          })
          setDeactivateTarget(null)
          setReloadKey((value) => value + 1)
          return
        }

        toast.current?.show({
          severity: 'error',
          summary: 'Deactivation failed',
          detail: readEmployeeError(reason),
        })
      })
      .finally(() => {
        savingRef.current = false
        setDeactivating(false)
      })
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setDepartmentId(null)
    setCountryId(null)
    setEmploymentStatus(null)
    setSortBy(defaultSort)
    setSortOrder('asc')
    setPage(1)
  }

  const total = result?.meta.total ?? 0
  const emptyMessage = resultIsFiltered
    ? 'No employees match these filters.'
    : 'No employees have been added yet.'

  const handlePageChange = useCallback(
    (nextPage: number, nextLimit: number) => {
      setPage(nextLimit === limit ? nextPage : 1)
      setLimit(nextLimit)
    },
    [limit],
  )

  const handleSortChange = useCallback((nextSortBy: EmployeeSortField, nextSortOrder: EmployeeSortOrder) => {
    setSortBy(nextSortBy)
    setSortOrder(nextSortOrder)
    setPage(1)
  }, [])

  const handleDeactivate = useCallback((employee: ListedEmployee) => {
    if (!savingRef.current && employee.employmentStatus !== 'INACTIVE') {
      setDeactivateTarget(employee)
    }
  }, [])

  return (
    <section className="employee-page">
      <Toast ref={toast} />
      <DeactivateEmployeeDialog
        visible={deactivateTarget !== null}
        employeeName={
          deactivateTarget === null
            ? ''
            : formatEmployeeName(deactivateTarget.firstName, deactivateTarget.lastName)
        }
        saving={deactivating}
        onHide={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
      />
      <header className="employee-page__header">
        <div>
          <p className="page__eyebrow">HR Manager</p>
          <h1>Employees</h1>
          <p>Search, filter, and open an employee profile.</p>
        </div>
        <Button
          type="button"
          label="Add employee"
          icon="pi pi-user-plus"
          onClick={() => navigate(routePaths.newEmployee)}
        />
      </header>

      <EmployeeFilters
        search={searchInput}
        departmentId={departmentId}
        countryId={countryId}
        employmentStatus={employmentStatus}
        departments={departments}
        countries={countries}
        onSearchChange={setSearchInput}
        onDepartmentChange={(value) => updateFilter(() => setDepartmentId(value))}
        onCountryChange={(value) => updateFilter(() => setCountryId(value))}
        onStatusChange={(value) => updateFilter(() => setEmploymentStatus(value))}
        onClear={clearFilters}
      />

      {error !== null ? (
        <div className="employee-page__error" role="alert">
          <p>{error}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setReloadKey((value) => value + 1)} />
        </div>
      ) : null}

      {loading && result === null && error === null ? (
        <div className="employee-page__loading" role="status" aria-label="Loading employees">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        </div>
      ) : null}

      {result !== null ? (
        <div className="employee-page__table">
          <EmployeeTable
            employees={result.data}
            loading={loading}
            page={page}
            limit={limit}
            total={total}
            sortBy={sortBy}
            sortOrder={sortOrder}
            emptyMessage={emptyMessage}
            deactivatingId={deactivating && deactivateTarget !== null ? deactivateTarget.id : null}
            onDeactivate={handleDeactivate}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
          />
        </div>
      ) : null}
    </section>
  )
}
