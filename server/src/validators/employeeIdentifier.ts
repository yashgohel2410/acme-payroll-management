import { z } from 'zod'

const MAX_EMPLOYEE_ID = 2_147_483_647
const employeeCodePattern = /^[A-Za-z0-9][A-Za-z0-9-]*$/

export type ParsedEmployeeIdentifier = {
  id?: number
  employeeCode?: string
}

export const employeeIdentifierSchema = z
  .string()
  .trim()
  .min(1, 'Employee identifier is required')
  .max(64, 'Employee identifier is too long')
  .superRefine((value, context) => {
    if (/^\d+$/.test(value)) {
      const id = Number(value)
      if (!Number.isInteger(id) || id < 1 || id > MAX_EMPLOYEE_ID) {
        context.addIssue({
          code: 'custom',
          path: ['id'],
          message: 'Employee id must be a positive integer',
        })
      }
      return
    }

    if (!employeeCodePattern.test(value)) {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'Employee identifier must be a positive id or employee code',
      })
    }
  })
  .transform((value): ParsedEmployeeIdentifier => {
    if (/^\d+$/.test(value)) {
      return { id: Number(value) }
    }

    return { employeeCode: value }
  })
