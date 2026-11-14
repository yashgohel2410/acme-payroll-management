import { Button } from 'primereact/button'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { routePaths } from '../../../app/routePaths.ts'
import { EmployeeForm } from '../components/EmployeeForm.tsx'
import { emptyEmployeeForm, parseEmployeeForm } from '../employeeForm.ts'
import {
  EmployeeSaveError,
  createEmployee,
  loadEmployeeReferenceOptions,
  loadNextEmployeeCode,
  readEmployeeError,
} from '../services/employeeApi.ts'
import type { EmployeeFormValues, EmployeeReferenceOptions } from '../types.ts'
import '../employees.css'

export function NewEmployeePage() {
  const navigate = useNavigate()
  const activeRef = useRef(true)
  const savingRef = useRef(false)
  const [options, setOptions] = useState<EmployeeReferenceOptions | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsReloadKey, setOptionsReloadKey] = useState(0)
  const [values, setValues] = useState<EmployeeFormValues>(emptyEmployeeForm)
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
    let active = true
    setOptionsLoading(true)
    setOptionsError(null)

    loadEmployeeReferenceOptions()
      .then((loaded) => {
        if (!active) {
          return
        }
        setOptions(loaded)
        setValues((current) => ({ ...current, employeeCode: loaded.nextEmployeeCode }))
        setOptionsLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }
        setOptionsError(readEmployeeError(reason))
        setOptionsLoading(false)
      })

    return () => {
      active = false
    }
  }, [optionsReloadKey])

  function updateValues(patch: Partial<EmployeeFormValues>) {
    setValues((current) => ({ ...current, ...patch }))
    setFieldErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) {
        delete next[key]
      }
      return next
    })
  }

  function submit() {
    if (savingRef.current || options === null) {
      return
    }

    const parsed = parseEmployeeForm(values, options.currencies)
    if ('fieldErrors' in parsed) {
      setFieldErrors(parsed.fieldErrors)
      setFormError('Check the highlighted fields.')
      return
    }

    savingRef.current = true
    setSaving(true)
    setFormError(null)
    setFieldErrors({})

    createEmployee(parsed.payload)
      .then((id) => {
        if (!activeRef.current) {
          return
        }
        navigate(`${routePaths.employees}/${id}`, { state: { created: true } })
      })
      .catch((reason: unknown) => {
        if (!activeRef.current) {
          return
        }
        if (reason instanceof EmployeeSaveError) {
          setFormError(reason.message)
          setFieldErrors({ ...reason.fields })
          if (reason.fields.employeeCode !== undefined) {
            loadNextEmployeeCode()
              .then((code) => {
                if (!activeRef.current) {
                  return
                }
                setValues((current) => ({ ...current, employeeCode: code }))
                setFieldErrors((current) => ({
                  ...current,
                  employeeCode: 'That code was just taken. The next code is assigned. Save again.',
                }))
              })
              .catch((refreshError: unknown) => {
                if (!activeRef.current) {
                  return
                }
                setFormError(readEmployeeError(refreshError))
              })
              .finally(() => {
                if (!activeRef.current) {
                  return
                }
                savingRef.current = false
                setSaving(false)
              })
            return
          }
        } else {
          setFormError(readEmployeeError(reason))
        }
        savingRef.current = false
        setSaving(false)
      })
  }

  return (
    <section className="employee-detail">
      <Link className="employee-detail__back" to={routePaths.employees}>
        <i className="pi pi-arrow-left" aria-hidden="true" />
        Back to employees
      </Link>
      <header className="employee-detail__header">
        <div>
          <p className="page__eyebrow">HR Manager</p>
          <h1>New employee</h1>
          <p>Add an active employee and their opening salary. Dates must be today or later.</p>
        </div>
      </header>

      {optionsLoading ? (
        <div className="employee-page__loading" role="status" aria-label="Loading form options">
          <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        </div>
      ) : null}

      {optionsError !== null ? (
        <div className="employee-page__error" role="alert">
          <p>{optionsError}</p>
          <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setOptionsReloadKey((value) => value + 1)} />
        </div>
      ) : null}

      {options !== null ? (
        <EmployeeForm
          values={values}
          errors={fieldErrors}
          departments={options.departments}
          countries={options.countries}
          currencies={options.currencies}
          saving={saving}
          formError={formError}
          onChange={updateValues}
          onSubmit={submit}
          onCancel={() => navigate(routePaths.employees)}
        />
      ) : null}
    </section>
  )
}
