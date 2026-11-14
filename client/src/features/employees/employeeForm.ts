import { z } from 'zod'
import type { CreateEmployeePayload, EmployeeCurrency, EmployeeFormValues } from './types.ts'

const maxId = 2_147_483_647

export const employeeCodePrefix = 'EMP-'

export const emptyEmployeeForm: EmployeeFormValues = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  designation: '',
  dateOfJoining: '',
  departmentId: null,
  countryId: null,
  amount: '',
  currencyId: null,
  effectiveFrom: '',
}

export function todayIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function readEmployeeSequence(code: string): number | null {
  const match = /^(?:EMP-|EMP)(\d+)$/.exec(code.trim())
  if (match === null) {
    return null
  }

  const sequence = Number(match[1])
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > maxId) {
    return null
  }

  return sequence
}

export function formatEmployeeCode(sequence: number): string {
  return `${employeeCodePrefix}${sequence}`
}

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const dateField = z
  .string()
  .trim()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine(isCalendarDate, 'Enter a valid calendar date')

const joiningDate = dateField.refine(
  (value) => value >= todayIsoDate(),
  'Date of joining cannot be in the past',
)

function requiredId(message: string) {
  return z
    .number()
    .int()
    .positive()
    .max(maxId)
    .nullable()
    .refine((value): value is number => value !== null, message)
}

const employeeFormSchema = z
  .object({
    employeeCode: z
      .string()
      .trim()
      .min(1, 'Employee code is required')
      .max(64, 'Employee code must be 64 characters or fewer')
      .regex(/^EMP-[1-9]\d*$/, 'Employee code must start with EMP-'),
    firstName: z.string().trim().min(1, 'First name is required').max(80, 'First name must be 80 characters or fewer'),
    lastName: z.string().trim().min(1, 'Last name is required').max(80, 'Last name must be 80 characters or fewer'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .max(254, 'Email must be 254 characters or fewer')
      .email('Enter a valid email')
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .min(1, 'Phone is required')
      .min(5, 'Phone must be 5 to 20 characters')
      .max(20, 'Phone must be 20 characters or fewer'),
    designation: z
      .string()
      .trim()
      .min(1, 'Designation is required')
      .max(80, 'Designation must be 80 characters or fewer'),
    dateOfJoining: joiningDate,
    departmentId: requiredId('Select a department'),
    countryId: requiredId('Select a country'),
    amount: z.string().trim().min(1, 'Salary amount is required'),
    currencyId: requiredId('Select a currency'),
    effectiveFrom: dateField,
  })
  .superRefine((value, context) => {
    if (value.effectiveFrom !== value.dateOfJoining) {
      context.addIssue({
        code: 'custom',
        path: ['effectiveFrom'],
        message: 'Effective date must match the date of joining',
      })
    }
  })

export function toMinorUnits(amount: string, minorUnitDigits: number): number | null {
  if (!Number.isInteger(minorUnitDigits) || minorUnitDigits < 0 || minorUnitDigits > 8) {
    return null
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim())
  if (match === null) {
    return null
  }

  const fraction = match[2] ?? ''
  if (fraction.length > minorUnitDigits) {
    return null
  }

  const scale = 10 ** minorUnitDigits
  const whole = Number(match[1])
  const fractional = Number(fraction.padEnd(minorUnitDigits, '0') || '0')
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fractional)) {
    return null
  }

  const minor = whole * scale + fractional
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > maxId) {
    return null
  }

  return minor
}

function fieldErrorsFromIssues(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && fields[key] === undefined) {
      fields[key] = issue.message
    }
  }

  return fields
}

function amountFormatError(values: EmployeeFormValues, currencies: readonly EmployeeCurrency[]): string | null {
  if (values.amount.trim().length === 0 || values.currencyId === null) {
    return null
  }

  const currency = currencies.find((item) => item.id === values.currencyId)
  if (currency === undefined || toMinorUnits(values.amount, currency.minorUnitDigits) !== null) {
    return null
  }

  const places = currency.minorUnitDigits === 0 ? 'a whole number' : `up to ${currency.minorUnitDigits} decimal places`
  return `Enter a positive amount with ${places}`
}

export function parseEmployeeForm(
  values: EmployeeFormValues,
  currencies: readonly EmployeeCurrency[],
): { payload: CreateEmployeePayload } | { fieldErrors: Record<string, string> } {
  const parsed = employeeFormSchema.safeParse(values)
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFromIssues(parsed.error)
    const amountMessage = amountFormatError(values, currencies)
    if (amountMessage !== null && fieldErrors.amount === undefined) {
      fieldErrors.amount = amountMessage
    }
    return { fieldErrors }
  }

  const currency = currencies.find((item) => item.id === parsed.data.currencyId)
  const fieldErrors: Record<string, string> = {}
  if (currency === undefined) {
    fieldErrors.currencyId = 'Select a currency'
  }

  const amount = currency === undefined ? null : toMinorUnits(parsed.data.amount, currency.minorUnitDigits)
  if (currency !== undefined && amount === null) {
    fieldErrors.amount = amountFormatError(values, currencies) ?? 'Enter a positive amount'
  }

  if (amount === null || Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  const payload: CreateEmployeePayload = {
    employeeCode: parsed.data.employeeCode,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    designation: parsed.data.designation,
    dateOfJoining: parsed.data.dateOfJoining,
    employmentStatus: 'ACTIVE',
    departmentId: parsed.data.departmentId,
    countryId: parsed.data.countryId,
    amount,
    currencyId: parsed.data.currencyId,
    effectiveFrom: parsed.data.dateOfJoining,
  }

  return { payload }
}
