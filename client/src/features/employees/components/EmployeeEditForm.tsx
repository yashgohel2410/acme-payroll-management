import { Button } from 'primereact/button'
import { Dropdown, type DropdownChangeEvent } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { formatEmploymentStatus } from '../formatEmployee.ts'
import { employmentStatuses, type EmployeeEditValues, type EmploymentStatus, type NamedOption } from '../types.ts'
import { FormField } from './FormField.tsx'

type EmployeeEditFormProps = {
  employeeCode: string
  dateOfJoining: string
  values: EmployeeEditValues
  errors: Readonly<Record<string, string>>
  departments: readonly NamedOption[]
  countries: readonly NamedOption[]
  saving: boolean
  formError: string | null
  onChange: (patch: Partial<EmployeeEditValues>) => void
  onSubmit: () => void
  onCancel: () => void
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

function describedBy(id: string, error: string | undefined): string | undefined {
  return error !== undefined && error.length > 0 ? `${id}-error` : undefined
}

export function EmployeeEditForm({
  employeeCode,
  dateOfJoining,
  values,
  errors,
  departments,
  countries,
  saving,
  formError,
  onChange,
  onSubmit,
  onCancel,
}: EmployeeEditFormProps) {
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
          Employee code and date of joining stay unchanged. Salary changes are made in salary management.
        </p>
        <div className="employee-form__grid">
          <FormField id="employeeCode" label="Employee code">
            <InputText id="employeeCode" value={employeeCode} readOnly disabled={saving} />
          </FormField>
          <FormField id="dateOfJoining" label="Date of joining">
            <InputText id="dateOfJoining" value={dateOfJoining} readOnly disabled={saving} />
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
              disabled={saving}
              aria-required="true"
              invalid={errors.email !== undefined}
              aria-describedby={describedBy('email', errors.email)}
              onChange={(event) => onChange({ email: event.target.value })}
            />
          </FormField>
          <FormField id="phone" label="Phone" error={errors.phone}>
            <InputText
              id="phone"
              value={values.phone}
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
              disabled={saving}
              aria-required="true"
              invalid={errors.designation !== undefined}
              aria-describedby={describedBy('designation', errors.designation)}
              onChange={(event) => onChange({ designation: event.target.value })}
            />
          </FormField>
          <FormField id="employmentStatus" label="Employment status" required error={errors.employmentStatus}>
            <Dropdown
              inputId="employmentStatus"
              value={values.employmentStatus}
              options={statusOptions}
              optionLabel="label"
              optionValue="value"
              disabled={saving}
              aria-required="true"
              invalid={errors.employmentStatus !== undefined}
              aria-describedby={describedBy('employmentStatus', errors.employmentStatus)}
              onChange={(event: DropdownChangeEvent) => {
                const status = readStatus(event.value)
                if (status !== null) {
                  onChange({ employmentStatus: status })
                }
              }}
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

      <div className="employee-form__actions">
        <Button type="button" label="Cancel" outlined disabled={saving} onClick={onCancel} />
        <Button type="submit" label="Save changes" icon="pi pi-check" loading={saving} disabled={saving} />
      </div>
    </form>
  )
}
