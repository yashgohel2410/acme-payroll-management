import { z } from 'zod'
import { employmentStatuses } from './employeeListQuery.js'

const MAX_ID = 2_147_483_647

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(5).max(20).nullable().optional(),
  designation: z.string().trim().min(1).max(80),
  departmentId: z.number().int().positive().max(MAX_ID),
  countryId: z.number().int().positive().max(MAX_ID),
  employmentStatus: z.enum(employmentStatuses),
})

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
