import { Button } from 'primereact/button'
import { Dropdown, type DropdownChangeEvent } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { todayIsoDate } from '../employeeForm.ts'
import type { EmployeeCurrency, EmployeeFormValues, NamedOption } from '../types.ts'
import { FormField } from './FormField.tsx'

type EmployeeFormProps = {
  values: EmployeeFormValues
  errors: Readonly<Record<string, string>>
  departments: readonly NamedOption[]
  countries: readonly NamedOption[]
  currencies: readonly EmployeeCurrency[]
  saving: boolean
  formError: string | null
  onChange: (patch: Partial<EmployeeFormValues>) => void
  onSubmit: () => void
  onCancel: () => void
}

function readId(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function describedBy(id: string, error: string | undefined): string | undefined {
  return error !== undefined && error.length > 0 ? `${id}-error` : undefined
}

export function EmployeeForm({
  values,
  errors,
  departments,
  countries,
  currencies,
  saving,
  formError,
  onChange,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const currencyOptions = currencies.map((currency) => ({
    id: currency.id,
    label: `${currency.code} · ${currency.name}`,
  }))
  const earliestDate = todayIsoDate()

  return (
    <form
      className="employee-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {formError !== null ? (
        <p className="employee-page__error" role="alert">
          {formError}
        </p>
      ) : null}

      <section className="employee-detail__panel">
        <h2>Employee</h2>
        <p className="employee-detail__empty">
          Every field is required. The employee code is assigned automatically and cannot be edited. EMP- stays fixed,
          and the number follows the last employee. New employees are saved as Active.
        </p>
        <div className="employee-form__grid">
          <FormField id="employeeCode" label="Employee code" required error={errors.employeeCode}>
            <InputText
              id="employeeCode"
              value={values.employeeCode}
              readOnly
              disabled={saving}
              aria-required="true"
              invalid={errors.employeeCode !== undefined}
              aria-describedby={describedBy('employeeCode', errors.employeeCode)}
            />
          </FormField>
          <FormField id="firstName" label="First name" required error={errors.firstName}>
            <InputText
              id="firstName"
              value={values.firstName}
              disabled={saving}
              aria-required="true"
              invalid={errors.firstName !== undefined}
              aria-describedby={describedBy('firstName', errors.firstName)}
              onChange={(event) => onChange({ firstName: event.target.value })}
            />
          </FormField>
          <FormField id="lastName" label="Last name" required error={errors.lastName}>
            <InputText
              id="lastName"
              value={values.lastName}
              disabled={saving}
              aria-required="true"
              invalid={errors.lastName !== undefined}
              aria-describedby={describedBy('lastName', errors.lastName)}
              onChange={(event) => onChange({ lastName: event.target.value })}
            />
          </FormField>
          <FormField id="email" label="Email" required error={errors.email}>
            <InputText
              id="email"
              type="email"
              value={values.email}
              aria-required="true"
              disabled={saving}
              invalid={errors.email !== undefined}
              aria-describedby={describedBy('email', errors.email)}
              onChange={(event) => onChange({ email: event.target.value })}
            />
          </FormField>
          <FormField id="phone" label="Phone" required error={errors.phone}>
            <InputText
              id="phone"
              value={values.phone}
              aria-required="true"
              disabled={saving}
              invalid={errors.phone !== undefined}
              aria-describedby={describedBy('phone', errors.phone)}
              onChange={(event) => onChange({ phone: event.target.value })}
            />
          </FormField>
          <FormField id="designation" label="Designation" required error={errors.designation}>
            <InputText
              id="designation"
              value={values.designation}
              aria-required="true"
              disabled={saving}
              invalid={errors.designation !== undefined}
              aria-describedby={describedBy('designation', errors.designation)}
              onChange={(event) => onChange({ designation: event.target.value })}
            />
          </FormField>
          <FormField id="dateOfJoining" label="Date of joining" required error={errors.dateOfJoining}>
            <InputText
              id="dateOfJoining"
              type="date"
              min={earliestDate}
              value={values.dateOfJoining}
              disabled={saving}
              aria-required="true"
              invalid={errors.dateOfJoining !== undefined}
              aria-describedby={describedBy('dateOfJoining', errors.dateOfJoining)}
              onChange={(event) => onChange({ dateOfJoining: event.target.value, effectiveFrom: event.target.value })}
            />
          </FormField>
          <FormField id="departmentId" label="Department" required error={errors.departmentId}>
            <Dropdown
              inputId="departmentId"
              value={values.departmentId}
              options={[...departments]}
              optionLabel="name"
              optionValue="id"
              placeholder="Select a department"
              disabled={saving}
              aria-required="true"
              invalid={errors.departmentId !== undefined}
              aria-describedby={describedBy('departmentId', errors.departmentId)}
              onChange={(event: DropdownChangeEvent) => onChange({ departmentId: readId(event.value) })}
            />
          </FormField>
          <FormField id="countryId" label="Country" required error={errors.countryId}>
            <Dropdown
              inputId="countryId"
              value={values.countryId}
              options={[...countries]}
              optionLabel="name"
              optionValue="id"
              placeholder="Select a country"
              disabled={saving}
              aria-required="true"
              invalid={errors.countryId !== undefined}
              aria-describedby={describedBy('countryId', errors.countryId)}
              onChange={(event: DropdownChangeEvent) => onChange({ countryId: readId(event.value) })}
            />
          </FormField>
        </div>
      </section>

      <section className="employee-detail__panel">
        <h2>Initial salary</h2>
        <p className="employee-detail__empty">
          Enter the amount in the selected currency. It is saved as an integer in that currency&apos;s minor units. The
          effective date is the date of joining and cannot be in the past.
        </p>
        <div className="employee-form__grid">
          <FormField id="amount" label="Salary amount" required error={errors.amount}>
            <InputText
              id="amount"
              inputMode="decimal"
              value={values.amount}
              disabled={saving}
              aria-required="true"
              invalid={errors.amount !== undefined}
              aria-describedby={describedBy('amount', errors.amount)}
              onChange={(event) => onChange({ amount: event.target.value })}
            />
          </FormField>
          <FormField id="currencyId" label="Currency" required error={errors.currencyId}>
            <Dropdown
              inputId="currencyId"
              value={values.currencyId}
              options={currencyOptions}
              optionLabel="label"
              optionValue="id"
              placeholder="Select a currency"
              disabled={saving}
              aria-required="true"
              invalid={errors.currencyId !== undefined}
              aria-describedby={describedBy('currencyId', errors.currencyId)}
              onChange={(event: DropdownChangeEvent) => onChange({ currencyId: readId(event.value) })}
            />
          </FormField>
          <FormField id="effectiveFrom" label="Effective from" required error={errors.effectiveFrom}>
            <InputText
              id="effectiveFrom"
              type="date"
              value={values.dateOfJoining}
              readOnly
              disabled={saving}
              aria-required="true"
              invalid={errors.effectiveFrom !== undefined}
              aria-describedby={describedBy('effectiveFrom', errors.effectiveFrom)}
            />
          </FormField>
        </div>
      </section>

      <div className="employee-form__actions">
        <Button type="button" label="Cancel" outlined disabled={saving} onClick={onCancel} />
        <Button type="submit" label="Save employee" icon="pi pi-check" loading={saving} disabled={saving} />
      </div>
    </form>
  )
}
