import {
  createEmployeeWithSalary,
  findEmployee,
  findEmployeePage,
  updateEmployeeRecord,
  type CreatedEmployee,
  type EmployeeDetails,
  type EmployeeLookup,
  type ListedEmployee,
  type UpdatedEmployee,
} from '../repositories/employee.repository.js'
import type { CreateEmployeeInput } from '../validators/createEmployee.js'
import type { EmployeeListQuery } from '../validators/employeeListQuery.js'
import type { UpdateEmployeeInput } from '../validators/updateEmployee.js'

export type EmployeeListResponse = {
  data: ListedEmployee[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function listEmployees(query: EmployeeListQuery): Promise<EmployeeListResponse> {
  const { total, employees } = await findEmployeePage(query, new Date())
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit)

  return {
    data: employees,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  }
}

export async function getEmployee(lookup: EmployeeLookup): Promise<EmployeeDetails | null> {
  return findEmployee(lookup, new Date())
}

export async function createEmployee(input: CreateEmployeeInput): Promise<CreatedEmployee> {
  return createEmployeeWithSalary(input)
}

export async function updateEmployee(
  lookup: EmployeeLookup,
  input: UpdateEmployeeInput,
): Promise<UpdatedEmployee> {
  return updateEmployeeRecord(lookup, input)
}
