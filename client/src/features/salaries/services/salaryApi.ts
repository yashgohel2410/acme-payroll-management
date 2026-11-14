import { apiClient } from '../../../services/api/httpClient.ts'
import { readApiErrorMessage } from '../../../services/api/apiError.ts'
import { parseRevisions } from '../../dashboard/services/dashboardApi.ts'
import type { RecentRevision } from '../../dashboard/types.ts'
import type { EmployeeCurrency } from '../../employees/types.ts'

export type SalarySortField = 'amount' | 'effectiveFrom' | 'effectiveTo'
export type SalarySortOrder = 'asc' | 'desc'

export type ListedSalary = {
  id: number
  amount: number
  effectiveFrom: string
  effectiveTo: string | null
  currency: EmployeeCurrency
  employee: {
    id: number
    employeeCode: string
    firstName: string
    lastName: string
    email: string
    department: { id: number; name: string }
    country: { id: number; name: string; isoCode: string }
  }
}

export type SalaryListResult = {
  data: ListedSalary[]
  meta: {
    page: number
    limit: number
    totalRecords: number
    totalPages: number
  }
}

export type SalaryListParams = {
  page: number
  limit: number
  search?: string
  sortBy: SalarySortField
  sortOrder: SalarySortOrder
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} response was not an object.`)
  }

  return value
}

function readNumber(record: Record<string, unknown>, field: string, label: string): number {
  const value = record[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} response is missing ${field}.`)
  }

  return value
}

function readString(record: Record<string, unknown>, field: string, label: string): string {
  const value = record[field]
  if (typeof value !== 'string') {
    throw new Error(`${label} response is missing ${field}.`)
  }

  return value
}

function readNullableString(record: Record<string, unknown>, field: string, label: string): string | null {
  const value = record[field]
  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`${label} response is missing ${field}.`)
  }

  return value
}

function parseCurrency(value: unknown): EmployeeCurrency {
  const record = readRecord(value, 'Salary currency')
  return {
    id: readNumber(record, 'id', 'Salary currency'),
    code: readString(record, 'code', 'Salary currency'),
    name: readString(record, 'name', 'Salary currency'),
    minorUnitDigits: readNumber(record, 'minorUnitDigits', 'Salary currency'),
  }
}

function parseSalary(value: unknown): ListedSalary {
  const record = readRecord(value, 'Salary')
  const employee = readRecord(record.employee, 'Salary employee')
  const department = readRecord(employee.department, 'Salary department')
  const country = readRecord(employee.country, 'Salary country')

  return {
    id: readNumber(record, 'id', 'Salary'),
    amount: readNumber(record, 'amount', 'Salary'),
    effectiveFrom: readString(record, 'effectiveFrom', 'Salary'),
    effectiveTo: readNullableString(record, 'effectiveTo', 'Salary'),
    currency: parseCurrency(record.currency),
    employee: {
      id: readNumber(employee, 'id', 'Salary employee'),
      employeeCode: readString(employee, 'employeeCode', 'Salary employee'),
      firstName: readString(employee, 'firstName', 'Salary employee'),
      lastName: readString(employee, 'lastName', 'Salary employee'),
      email: readString(employee, 'email', 'Salary employee'),
      department: {
        id: readNumber(department, 'id', 'Salary department'),
        name: readString(department, 'name', 'Salary department'),
      },
      country: {
        id: readNumber(country, 'id', 'Salary country'),
        name: readString(country, 'name', 'Salary country'),
        isoCode: readString(country, 'isoCode', 'Salary country'),
      },
    },
  }
}

export function parseSalaryList(value: unknown): SalaryListResult {
  const body = readRecord(value, 'Salary list')
  if (!Array.isArray(body.data)) {
    throw new Error('Salary list response data is not a list.')
  }

  const meta = readRecord(body.meta, 'Salary list')
  return {
    data: body.data.map(parseSalary),
    meta: {
      page: readNumber(meta, 'page', 'Salary list'),
      limit: readNumber(meta, 'limit', 'Salary list'),
      totalRecords: readNumber(meta, 'totalRecords', 'Salary list'),
      totalPages: readNumber(meta, 'totalPages', 'Salary list'),
    },
  }
}

export function readSalaryError(error: unknown): string {
  return readApiErrorMessage(error, 'Salaries could not be loaded.')
}

export async function listSalaries(params: SalaryListParams): Promise<SalaryListResult> {
  const response = await apiClient.get<unknown>('/salaries', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  })

  return parseSalaryList(response.data)
}

export async function loadRecentSalaryRevisions(): Promise<RecentRevision[]> {
  const response = await apiClient.get<unknown>('/dashboard/recent-revisions', {
    params: { limit: 50 },
  })

  return parseRevisions(response.data)
}
