import type { ReactNode } from 'react'

type FormFieldProps = {
  id: string
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}

export function FormField({ id, label, required = false, error, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="form-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {error !== undefined && error.length > 0 ? (
        <p id={`${id}-error`} className="form-field__error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
