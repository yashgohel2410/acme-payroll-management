import { Button } from 'primereact/button'
import { Dropdown, type DropdownChangeEvent } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { useEffect, useRef, useState } from 'react'
import type { EmployeeCurrency } from '../types.ts'
import { FormField } from './FormField.tsx'
import { emptySalaryRevision, parseSalaryRevision, type SalaryRevisionValues } from '../salaryRevision.ts'
import { EmployeeSaveError, loadEmployeeReferenceOptions, readEmployeeError, reviseEmployeeSalary } from '../services/employeeApi.ts'

type SalaryRevisionFormProps = {
  employeeId: number
  onRevised: () => void
}

function readId(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function describedBy(id: string, error: string | undefined): string | undefined {
  return error !== undefined && error.length > 0 ? `${id}-error` : undefined
}

export function SalaryRevisionForm({ employeeId, onRevised }: SalaryRevisionFormProps) {
  const [currencies, setCurrencies] = useState<EmployeeCurrency[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [values, setValues] = useState<SalaryRevisionValues>(emptySalaryRevision)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)

    loadEmployeeReferenceOptions()
      .then((options) => {
        if (active) {
          setCurrencies(options.currencies)
          setLoading(false)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setLoadError(readEmployeeError(reason))
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  function update(patch: Partial<SalaryRevisionValues>) {
    setValues((current) => ({ ...current, ...patch }))
  }

  async function submit() {
    if (savingRef.current) {
      return
    }

    const parsed = parseSalaryRevision(values, currencies)
    if ('fieldErrors' in parsed) {
      setErrors(parsed.fieldErrors)
      setFormError('Correct the highlighted fields and save again.')
      return
    }

    savingRef.current = true
    setSaving(true)
    setErrors({})
    setFormError(null)

    try {
      await reviseEmployeeSalary(employeeId, parsed.payload)
      setValues(emptySalaryRevision)
      onRevised()
    } catch (reason: unknown) {
      if (reason instanceof EmployeeSaveError) {
        setErrors(reason.fields)
        setFormError(reason.message)
      } else if (reason instanceof Error) {
        setFormError(reason.message)
      } else {
        setFormError('The salary revision could not be saved.')
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="employee-page__loading" role="status">
        <i className="pi pi-spin pi-spinner" aria-hidden="true" />
        Loading currencies
      </p>
    )
  }

  if (loadError !== null) {
    return (
      <div className="employee-page__error" role="alert">
        <p>{loadError}</p>
        <Button type="button" label="Try again" icon="pi pi-refresh" onClick={() => setReloadKey((value) => value + 1)} />
      </div>
    )
  }

  return (
    <form
      className="employee-form salary-revision"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {formError !== null ? (
        <p className="employee-form__error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="employee-form__grid">
        <FormField id="revision-amount" label="New amount" required error={errors.amount}>
          <InputText
            id="revision-amount"
            value={values.amount}
            inputMode="decimal"
            aria-invalid={errors.amount !== undefined}
            aria-describedby={describedBy('revision-amount', errors.amount)}
            onChange={(event) => update({ amount: event.target.value })}
          />
        </FormField>
        <FormField id="revision-currency" label="Currency" required error={errors.currencyId}>
          <Dropdown
            inputId="revision-currency"
            value={values.currencyId}
            options={[...currencies]}
            optionLabel="code"
            optionValue="id"
            placeholder="Select a currency"
            aria-invalid={errors.currencyId !== undefined}
            aria-describedby={describedBy('revision-currency', errors.currencyId)}
            onChange={(event: DropdownChangeEvent) => update({ currencyId: readId(event.value) })}
          />
        </FormField>
        <FormField id="revision-effective" label="Effective from" required error={errors.effectiveFrom}>
          <InputText
            id="revision-effective"
            type="date"
            value={values.effectiveFrom}
            aria-invalid={errors.effectiveFrom !== undefined}
            aria-describedby={describedBy('revision-effective', errors.effectiveFrom)}
            onChange={(event) => update({ effectiveFrom: event.target.value })}
          />
        </FormField>
        <FormField id="revision-reason" label="Reason" required error={errors.reason}>
          <InputTextarea
            id="revision-reason"
            value={values.reason}
            rows={3}
            autoResize
            aria-invalid={errors.reason !== undefined}
            aria-describedby={describedBy('revision-reason', errors.reason)}
            onChange={(event) => update({ reason: event.target.value })}
          />
        </FormField>
      </div>
      <div className="employee-form__actions">
        <Button type="submit" label="Save revision" icon="pi pi-check" loading={saving} disabled={saving} />
      </div>
    </form>
  )
}
