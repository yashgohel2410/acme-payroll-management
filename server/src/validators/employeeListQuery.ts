import { z } from 'zod'

export const employeeSortFields = [
  'employeeCode',
  'firstName',
  'lastName',
  'email',
  'dateOfJoining',
  'designation',
  'employmentStatus',
] as const

export const employmentStatuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  return value
}

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  departmentId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  countryId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  employmentStatus: z.preprocess(emptyToUndefined, z.enum(employmentStatuses).optional()),
  sortBy: z.enum(employeeSortFields).default('employeeCode'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>
