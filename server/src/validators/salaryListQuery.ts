import { z } from 'zod'

export const salarySortFields = ['amount', 'effectiveFrom', 'effectiveTo'] as const

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}

function utcDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date
}

const effectiveDate = z
  .string()
  .trim()
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

export const salaryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  departmentId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  countryId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  currencyId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  effectiveDate: z.preprocess(emptyToUndefined, effectiveDate.optional()),
  sortBy: z.enum(salarySortFields).default('effectiveFrom'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type SalaryListQuery = z.infer<typeof salaryListQuerySchema>
