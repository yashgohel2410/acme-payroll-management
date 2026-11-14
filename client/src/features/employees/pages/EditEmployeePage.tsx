import { Button } from 'primereact/button'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { routePaths } from '../../../app/routePaths.ts'
import { EmployeeEditForm } from '../components/EmployeeEditForm.tsx'
import { employeeEditValues, emptyEmployeeEdit, parseEmployeeEdit } from '../employeeEditForm.ts'
import { formatEmployeeName, formatIsoDate } from '../formatEmployee.ts'
import {
  EmployeeNotFoundError,
  EmployeeSaveError,
  getEmployee,
  loadEmployeeCatalog,
  readEmployeeError,
  updateEmployee,
} from '../services/employeeApi.ts'
import type { EmployeeCatalogOptions, EmployeeDetails, EmployeeEditValues, NamedOption } from '../types.ts'
import '../employees.css'

function includeOption(options: NamedOption[], option: NamedOption): NamedOption[] {
  if (options.some((item) => item.id === option.id)) {
    return options
  }

  return [...options, option].sort((left, right) => left.name.localeCompare(right.name))
}

export function EditEmployeePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const activeRef = useRef(true)
  const savingRef = useRef(false)
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null)
  const [options, setOptions] = useState<EmployeeCatalogOptions | null>(null)
  const [values, setValues] = useState<EmployeeEditValues>(emptyEmployeeEdit)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  useEffect(() => {
    if (id === undefined || id.trim().length === 0) {
      setEmployee(null)
      setOptions(null)
      setNotFound(true)
      setLoadError(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setNotFound(false)
    setLoadError(null)
    setEmployee(null)
    setOptions(null)
    setFormError(null)
    setFieldErrors({})

    Promise.allSettled([getEmployee(id), loadEmployeeCatalog()]).then((results) => {
      if (!active) {
        return
      }

      const [employeeResult, optionsResult] = results
      if (employeeResult.status === 'rejected') {
        if (employeeResult.reason instanceof EmployeeNotFoundError) {
          setNotFound(true)
        } else {
          setLoadError(readEmployeeError(employeeResult.reason))
        }
        setLoading(false)
        return
      }

      if (optionsResult.status === 'rejected') {
        setLoadError(readEmployeeError(optionsResult.reason))
        setLoading(false)
        return
      }

      const loadedEmployee = employeeResult.value
      const loadedOptions = optionsResult.value
      setEmployee(loadedEmployee)
      setOptions({
        ...loadedOptions,
        departments: includeOption(loadedOptions.departments, {
          id: loadedEmployee.department.id,
          name: loadedEmployee.department.name,
        }),
        countries: includeOption(loadedOptions.countries, {
          id: loadedEmployee.country.id,
          name: loadedEmployee.country.name,
          detail: loadedEmployee.country.isoCode,
        }),
      })
      setValues(employeeEditValues(loadedEmployee))
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [id, reloadKey])

  function updateValues(patch: Partial<EmployeeEditValues>) {
    setValues((current) => ({ ...current, ...patch }))
    setFormError(null)
    setFieldErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) {
        delete next[key]
      }
      return next
    })
  }

  function submit() {
    if (savingRef.current || id === undefined || employee === null) {
      return
    }

    const parsed = parseEmployeeEdit(values)
    if ('fieldErrors' in parsed) {
      setFieldErrors(parsed.fieldErrors)
      setFormError('Check the highlighted fields.')
      return
    }

    savingRef.current = true
    setSaving(true)
    setFormError(null)
    setFieldErrors({})

    updateEmployee(id, parsed.payload)
      .then(() => {
        if (!activeRef.current) {
          return
        }
        navigate(`${routePaths.employees}/${id}`, { state: { updated: true } })
      })
      .catch((reason: unknown) => {
        if (!activeRef.current) {
          return
        }
        if (reason instanceof EmployeeNotFoundError) {
          setNotFound(true)
          setEmployee(null)
        } else if (reason instanceof EmployeeSaveError) {
          setFormError(reason.message)
          setFieldErrors({ ...reason.fields })
        } else {
          setFormError(readEmployeeError(reason))
        }
        savingRef.current = false
        setSaving(false)
      })
  }

  if (loading) {
    return (
      <section className="employee-detail">
        <div className="employee-page__loading" role="status" aria-label="Loading employee">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        </div>
      </section>
    )
  }

  if (notFound) {
    return (
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
  }

  if (employee !== null && employee.employmentStatus === 'INACTIVE') {
    return (
      <section className="employee-detail">
        <Link className="employee-detail__back" to={`${routePaths.employees}/${employee.id}`}>
          <i className="pi pi-arrow-left" aria-hidden="true" />
          Back to profile
        </Link>
        <div className="employee-detail__notice" role="status">
          <h1>Employee deactivated</h1>
          <p>This profile can no longer be edited. The employment status is Deactivated.</p>
        </div>
      </section>
    )
  }

  if (loadError !== null || employee === null || options === null) {
    return (
      <section className="employee-detail">
        <Link className="employee-detail__back" to={routePaths.employees}>
          <i className="pi pi-arrow-left" aria-hidden="true" />
          Back to employees
        </Link>
        <div className="employee-page__error" role="alert">
          <p>{loadError ?? 'Employee could not be loaded.'}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setReloadKey((value) => value + 1)} />
        </div>
      </section>
    )
  }

  return (
    <section className="employee-detail">
      <Link className="employee-detail__back" to={`${routePaths.employees}/${id}`}>
        <i className="pi pi-arrow-left" aria-hidden="true" />
        Back to profile
      </Link>
      <header className="employee-detail__header">
        <div>
          <p className="page__eyebrow">{employee.employeeCode}</p>
          <h1>Edit {formatEmployeeName(employee.firstName, employee.lastName)}</h1>
          <p>Update the profile. Salary is left unchanged.</p>
        </div>
      </header>
      <EmployeeEditForm
        employeeCode={employee.employeeCode}
        dateOfJoining={formatIsoDate(employee.dateOfJoining)}
        values={values}
        errors={fieldErrors}
        departments={options.departments}
        countries={options.countries}
        saving={saving}
        formError={formError}
        onChange={updateValues}
        onSubmit={submit}
        onCancel={() => navigate(`${routePaths.employees}/${id}`)}
      />
    </section>
  )
}
