import { z } from 'zod'
import { employmentStatuses } from './employeeListQuery.js'

const MAX_ID = 2_147_483_647
const employeeCodePattern = /^[A-Za-z0-9][A-Za-z0-9-]*$/

function utcDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format')
  .transform((value, context) => {
    const date = utcDate(value)
    if (date === null) {
      context.addIssue({
        code: 'custom',
        message: 'Expected a valid calendar date',
      })
      return z.NEVER
    }

    return date
  })

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(employeeCodePattern, 'Employee code must contain only letters, numbers, and hyphens'),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(5).max(20).nullable().optional(),
  designation: z.string().trim().min(1).max(80),
  dateOfJoining: dateField,
  employmentStatus: z.enum(employmentStatuses),
  departmentId: z.number().int().positive().max(MAX_ID),
  countryId: z.number().int().positive().max(MAX_ID),
  amount: z.number().int().positive().max(MAX_ID),
  currencyId: z.number().int().positive().max(MAX_ID),
  effectiveFrom: dateField,
})

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
