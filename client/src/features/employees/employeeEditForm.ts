import { z } from 'zod'
import {
  employmentStatuses,
  type EmployeeDetails,
  type EmployeeEditValues,
  type EmploymentStatus,
  type UpdateEmployeePayload,
} from './types.ts'

const maxId = 2_147_483_647

export const emptyEmployeeEdit: EmployeeEditValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  designation: '',
  departmentId: null,
  countryId: null,
  employmentStatus: 'ACTIVE',
}

export function employeeEditValues(employee: EmployeeDetails): EmployeeEditValues {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone ?? '',
    designation: employee.designation,
    departmentId: employee.department.id,
    countryId: employee.country.id,
    employmentStatus: employee.employmentStatus,
  }
}

function requiredId(message: string) {
  return z
    .number()
    .int()
    .positive()
    .max(maxId)
    .nullable()
    .refine((value): value is number => value !== null, message)
}

const employeeEditSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80, 'First name must be 80 characters or fewer'),
  lastName: z.string().trim().min(1, 'Last name is required').max(80, 'Last name must be 80 characters or fewer'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(254, 'Email must be 254 characters or fewer')
    .email('Enter a valid email')
    .transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(20, 'Phone must be 20 characters or fewer'),
  designation: z
    .string()
    .trim()
    .min(1, 'Designation is required')
    .max(80, 'Designation must be 80 characters or fewer'),
  departmentId: requiredId('Select a department'),
  countryId: requiredId('Select a country'),
  employmentStatus: z.enum(employmentStatuses, 'Select an employment status'),
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

export function parseEmployeeEdit(
  values: EmployeeEditValues,
): { payload: UpdateEmployeePayload } | { fieldErrors: Record<string, string> } {
  const parsed = employeeEditSchema.safeParse(values)
  const fieldErrors = parsed.success ? {} : fieldErrorsFromIssues(parsed.error)
  const phone = values.phone.trim()
  if (phone.length > 0 && phone.length < 5 && fieldErrors.phone === undefined) {
    fieldErrors.phone = 'Phone must be 5 to 20 characters'
  }

  if (!parsed.success || fieldErrors.phone !== undefined) {
    return { fieldErrors }
  }

  const status: EmploymentStatus = parsed.data.employmentStatus
  const payload: UpdateEmployeePayload = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    phone: parsed.data.phone.length > 0 ? parsed.data.phone : null,
    designation: parsed.data.designation,
    departmentId: parsed.data.departmentId,
    countryId: parsed.data.countryId,
    employmentStatus: status,
  }

  return { payload }
}
