import type { EmployeeLookup } from '../repositories/employee.repository.js'
import {
  createSalaryRevisionRecord,
  findSalaryPage,
  type CreatedSalaryRevision,
  type ListedSalary,
} from '../repositories/salary.repository.js'
import type { CreateSalaryRevisionInput } from '../validators/createSalaryRevision.js'
import type { SalaryListQuery } from '../validators/salaryListQuery.js'

export type SalaryListResponse = {
  data: ListedSalary[]
  meta: {
    page: number
    limit: number
    totalRecords: number
    totalPages: number
  }
}

export async function createSalaryRevision(
  lookup: EmployeeLookup,
  input: CreateSalaryRevisionInput,
): Promise<CreatedSalaryRevision> {
  return createSalaryRevisionRecord(lookup, input)
}

export async function listSalaries(query: SalaryListQuery): Promise<SalaryListResponse> {
  const { totalRecords, salaries } = await findSalaryPage(query)
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.limit)

  return {
    data: salaries,
    meta: {
      page: query.page,
      limit: query.limit,
      totalRecords,
      totalPages,
    },
  }
}
