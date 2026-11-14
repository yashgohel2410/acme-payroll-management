import { z } from 'zod'
import { toMinorUnits } from './employeeForm.ts'
import type { EmployeeCurrency } from './types.ts'

const maxId = 2_147_483_647

export type SalaryRevisionValues = {
  amount: string
  currencyId: number | null
  effectiveFrom: string
  reason: string
}

export type SalaryRevisionPayload = {
  amount: number
  currencyId: number
  effectiveFrom: string
  reason: string
}

export const emptySalaryRevision: SalaryRevisionValues = {
  amount: '',
  currencyId: null,
  effectiveFrom: '',
  reason: '',
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

const revisionSchema = z.object({
  amount: z.string().trim().min(1, 'Amount is required'),
  currencyId: z.number().int().positive().max(maxId).nullable(),
  effectiveFrom: z
    .string()
    .trim()
    .min(1, 'Effective date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
    .refine(isCalendarDate, 'Enter a valid calendar date'),
  reason: z.string().trim().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or fewer'),
})

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

export function parseSalaryRevision(
  values: SalaryRevisionValues,
  currencies: readonly EmployeeCurrency[],
): { payload: SalaryRevisionPayload } | { fieldErrors: Record<string, string> } {
  const parsed = revisionSchema.safeParse(values)
  const fieldErrors = parsed.success ? {} : fieldErrorsFromIssues(parsed.error)

  if (values.currencyId === null && fieldErrors.currencyId === undefined) {
    fieldErrors.currencyId = 'Select a currency'
  }

  const currency = currencies.find((item) => item.id === values.currencyId)
  if (values.amount.trim().length > 0 && currency !== undefined && fieldErrors.amount === undefined) {
    if (toMinorUnits(values.amount, currency.minorUnitDigits) === null) {
      const places = currency.minorUnitDigits === 0 ? 'a whole number' : `up to ${currency.minorUnitDigits} decimal places`
      fieldErrors.amount = `Enter a positive amount with ${places}`
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !parsed.success || currency === undefined) {
    return { fieldErrors }
  }

  const amount = toMinorUnits(parsed.data.amount, currency.minorUnitDigits)
  if (amount === null) {
    return { fieldErrors: { amount: 'Enter a positive amount' } }
  }

  return {
    payload: {
      amount,
      currencyId: currency.id,
      effectiveFrom: parsed.data.effectiveFrom,
      reason: parsed.data.reason.trim(),
    },
  }
}
