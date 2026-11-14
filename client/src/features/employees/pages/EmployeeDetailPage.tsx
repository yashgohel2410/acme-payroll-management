import type { ReactNode } from 'react'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/routePaths.ts'
import { DeactivateEmployeeDialog } from '../components/DeactivateEmployeeDialog.tsx'
import { EmployeeSalaryHistory } from '../components/EmployeeSalaryHistory.tsx'
import { SalaryRevisionForm } from '../components/SalaryRevisionForm.tsx'
import {
  formatCurrentSalary,
  formatEmployeeName,
  formatEmploymentStatus,
  formatIsoDate,
} from '../formatEmployee.ts'
import {
  EmployeeAlreadyInactiveError,
  EmployeeNotFoundError,
  deactivateEmployee,
  getEmployee,
  readEmployeeError,
} from '../services/employeeApi.ts'
import type { EmployeeDetails } from '../types.ts'
import '../employees.css'

function isStateRecord(state: unknown): state is Record<string, unknown> {
  return typeof state === 'object' && state !== null
}

function routeFlag(state: unknown, key: 'created' | 'updated'): boolean {
  return isStateRecord(state) && state[key] === true
}

export function EmployeeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const created = routeFlag(location.state, 'created')
  const updated = routeFlag(location.state, 'updated')
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const toast = useRef<Toast>(null)
  const savingRef = useRef(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  useEffect(() => {
    if (id === undefined || id.trim().length === 0) {
      setEmployee(null)
      setNotFound(true)
      setError(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)
    setNotFound(false)
    setEmployee(null)

    getEmployee(id)
      .then((details) => {
        if (!active) {
          return
        }
        setEmployee(details)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }
        if (reason instanceof EmployeeNotFoundError) {
          setNotFound(true)
        } else {
          setError(readEmployeeError(reason))
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, reloadKey])

  function refreshEmployee() {
    if (id === undefined) {
      return
    }

    getEmployee(id)
      .then((details) => {
        if (activeRef.current) {
          setEmployee(details)
        }
      })
      .catch((reason: unknown) => {
        if (!activeRef.current) {
          return
        }
        if (reason instanceof EmployeeNotFoundError) {
          setNotFound(true)
          setEmployee(null)
          return
        }
        toast.current?.show({
          severity: 'error',
          summary: 'Refresh failed',
          detail: readEmployeeError(reason),
        })
      })
  }

  function confirmDeactivate() {
    if (savingRef.current || employee === null) {
      return
    }

    savingRef.current = true
    setDeactivating(true)

    deactivateEmployee(String(employee.id))
      .then(() => {
        if (!activeRef.current) {
          return
        }
        setConfirmOpen(false)
        setLoading(true)
        setEmployee(null)
        navigate(routePaths.employees, {
          state: { deactivatedEmployee: formatEmployeeName(employee.firstName, employee.lastName) },
        })
      })
      .catch((reason: unknown) => {
        if (!activeRef.current) {
          return
        }
        if (reason instanceof EmployeeNotFoundError) {
          setConfirmOpen(false)
          setNotFound(true)
          setEmployee(null)
          toast.current?.show({
            severity: 'error',
            summary: 'Employee not found',
            detail: reason.message,
          })
          return
        }
        if (reason instanceof EmployeeAlreadyInactiveError) {
          toast.current?.show({
            severity: 'warn',
            summary: 'Already inactive',
            detail: reason.message,
          })
          setConfirmOpen(false)
          refreshEmployee()
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
        if (activeRef.current) {
          setDeactivating(false)
        }
      })
  }

  let page: ReactNode
  if (loading) {
    page = (
      <section className="employee-detail">
        <div className="employee-page__loading" role="status" aria-label="Loading employee">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        </div>
      </section>
    )
  } else if (notFound) {
    page = (
      <section className="employee-detail">
        <Link className="employee-detail__back" to={routePaths.employees}>
          <i className="pi pi-arrow-left" aria-hidden="true" />
          Back to employees
        </Link>
        <div className="employee-detail__notice" role="status">
          <h1>Employee not found</h1>
          <p>This profile is not in the employee directory.</p>
        </div>
      </section>
    )
  } else if (error !== null || employee === null) {
    page = (
      <section className="employee-detail">
        <Link className="employee-detail__back" to={routePaths.employees}>
          <i className="pi pi-arrow-left" aria-hidden="true" />
          Back to employees
        </Link>
        <div className="employee-page__error" role="alert">
          <p>{error ?? 'Employee could not be loaded.'}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setReloadKey((value) => value + 1)} />
        </div>
      </section>
    )
  } else {
  const fullName = formatEmployeeName(employee.firstName, employee.lastName)

  page = (
    <section className="employee-detail">
      <DeactivateEmployeeDialog
        visible={confirmOpen}
        employeeName={fullName}
        saving={deactivating}
        onHide={() => setConfirmOpen(false)}
        onConfirm={confirmDeactivate}
      />
      <Link className="employee-detail__back" to={routePaths.employees}>
        <i className="pi pi-arrow-left" aria-hidden="true" />
        Back to employees
      </Link>

      {created ? (
        <p className="employee-detail__success" role="status">
          Employee created.
        </p>
      ) : null}

      {updated ? (
        <p className="employee-detail__success" role="status">
          Employee updated.
        </p>
      ) : null}

      <header className="employee-detail__header">
        <div>
          <p className="page__eyebrow">{employee.employeeCode}</p>
          <h1>{fullName}</h1>
          <p>{employee.designation}</p>
        </div>
        <div className="employee-detail__header-side">
          <span className={`employee-status employee-status--${employee.employmentStatus.toLowerCase()}`}>
            {formatEmploymentStatus(employee.employmentStatus)}
          </span>
          {employee.employmentStatus === 'INACTIVE' ? null : (
            <Button
              type="button"
              label="Edit"
              icon="pi pi-pencil"
              onClick={() => navigate(`${routePaths.employees}/${employee.id}/edit`)}
            />
          )}
          <Button
            type="button"
            label="Deactivate"
            icon="pi pi-ban"
            severity="danger"
            outlined
            disabled={employee.employmentStatus === 'INACTIVE' || deactivating}
            onClick={() => setConfirmOpen(true)}
          />
        </div>
      </header>

      <dl className="employee-detail__facts employee-detail__panel">
        <div>
          <dt>Employee code</dt>
          <dd>{employee.employeeCode}</dd>
        </div>
        <div>
          <dt>Full name</dt>
          <dd>{fullName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{employee.email}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{employee.phone ?? '—'}</dd>
        </div>
        <div>
          <dt>Designation</dt>
          <dd>{employee.designation}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{employee.department.name}</dd>
        </div>
        <div>
          <dt>Country</dt>
          <dd>
            {employee.country.name} ({employee.country.isoCode})
          </dd>
        </div>
        <div>
          <dt>Date of joining</dt>
          <dd>{formatIsoDate(employee.dateOfJoining)}</dd>
        </div>
        <div>
          <dt>Employment status</dt>
          <dd>{formatEmploymentStatus(employee.employmentStatus)}</dd>
        </div>
      </dl>

      <section className="employee-detail__panel">
        <h2>Current salary</h2>
        {employee.currentSalary === null ? (
          <p className="employee-detail__empty">No current salary is on file.</p>
        ) : (
          <dl className="employee-detail__facts">
            <div>
              <dt>Amount</dt>
              <dd>{formatCurrentSalary(employee.currentSalary)}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>
                {employee.currentSalary.currency.code} · {employee.currentSalary.currency.name}
              </dd>
            </div>
            <div>
              <dt>Effective date</dt>
              <dd>{formatIsoDate(employee.currentSalary.effectiveFrom)}</dd>
            </div>
          </dl>
        )}
      </section>

      {employee.employmentStatus === 'INACTIVE' ? (
        <section className="employee-detail__panel">
          <h2>Revise salary</h2>
          <p className="employee-detail__empty">Salary cannot be revised while this employee is deactivated.</p>
        </section>
      ) : (
        <section className="employee-detail__panel">
          <h2>Revise salary</h2>
          <p className="employee-detail__empty">Enter the new amount in major units. The effective date starts the new salary period.</p>
          <SalaryRevisionForm
            employeeId={employee.id}
            onRevised={() => {
              toast.current?.show({
                severity: 'success',
                summary: 'Salary revised',
                detail: 'The new salary period is now current.',
              })
              refreshEmployee()
            }}
          />
        </section>
      )}

      <section className="employee-detail__panel">
        <h2>Salary history</h2>
        <EmployeeSalaryHistory salaries={employee.salaryHistory} />
      </section>
    </section>
  )
  }

  return (
    <>
      <Toast ref={toast} />
      {page}
    </>
  )
}
