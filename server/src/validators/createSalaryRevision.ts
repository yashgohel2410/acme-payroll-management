import { z } from 'zod'

const MAX_ID = 2_147_483_647

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

export const createSalaryRevisionSchema = z.object({
  amount: z.number().int().positive().max(MAX_ID),
  currencyId: z.number().int().positive().max(MAX_ID),
  effectiveFrom: dateField,
  reason: z.string().trim().min(1).max(500),
})

export type CreateSalaryRevisionInput = z.infer<typeof createSalaryRevisionSchema>
