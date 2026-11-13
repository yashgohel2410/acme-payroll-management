import { findEmployeePage, type ListedEmployee } from '../repositories/employee.repository.js'
import type { EmployeeListQuery } from '../validators/employeeListQuery.js'

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
