import axios from 'axios'
import { apiClient } from '../../../services/api/httpClient.ts'
import {
  employmentStatuses,
  type EmployeeListParams,
  type EmployeeListResult,
  type EmploymentStatus,
  type ListedEmployee,
  type NamedOption,
} from '../types.ts'

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

function readNullableString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field]
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`Employee response is missing ${field}.`)
  }

  return value
}

function isEmploymentStatus(value: string): value is EmploymentStatus {
  return employmentStatuses.some((status) => status === value)
}

function parseCurrency(value: unknown): ListedEmployee['currentSalary'] {
  if (value === null || value === undefined) {
    return null
  }

  const salary = readRecord(value, 'Current salary')
  const currency = readRecord(salary.currency, 'Current salary currency')

  return {
    amount: readNumber(salary, 'amount', 'Current salary'),
    currency: {
      id: readNumber(currency, 'id', 'Current salary currency'),
      code: readString(currency, 'code', 'Current salary currency'),
      name: readString(currency, 'name', 'Current salary currency'),
      minorUnitDigits: readNumber(currency, 'minorUnitDigits', 'Current salary currency'),
    },
  }
}

function parseEmployee(value: unknown): ListedEmployee {
  const record = readRecord(value, 'Employee')
  const status = readString(record, 'employmentStatus', 'Employee')
  if (!isEmploymentStatus(status)) {
    throw new Error('Employee response has an unknown employment status.')
  }

  const department = readRecord(record.department, 'Employee department')
  const country = readRecord(record.country, 'Employee country')

  return {
    id: readNumber(record, 'id', 'Employee'),
    employeeCode: readString(record, 'employeeCode', 'Employee'),
    firstName: readString(record, 'firstName', 'Employee'),
    lastName: readString(record, 'lastName', 'Employee'),
    email: readString(record, 'email', 'Employee'),
    phone: readNullableString(record, 'phone'),
    dateOfJoining: readString(record, 'dateOfJoining', 'Employee'),
    designation: readString(record, 'designation', 'Employee'),
    employmentStatus: status,
    department: {
      id: readNumber(department, 'id', 'Employee department'),
      name: readString(department, 'name', 'Employee department'),
    },
    country: {
      id: readNumber(country, 'id', 'Employee country'),
      name: readString(country, 'name', 'Employee country'),
      isoCode: readString(country, 'isoCode', 'Employee country'),
    },
    currentSalary: parseCurrency(record.currentSalary),
  }
}

function parseList(value: unknown): EmployeeListResult {
  const record = readRecord(value, 'Employee list')
  if (!Array.isArray(record.data)) {
    throw new Error('Employee list response is missing data.')
  }

  const meta = readRecord(record.meta, 'Employee list')

  return {
    data: record.data.map((item) => parseEmployee(item)),
    meta: {
      page: readNumber(meta, 'page', 'Employee list'),
      limit: readNumber(meta, 'limit', 'Employee list'),
      total: readNumber(meta, 'total', 'Employee list'),
      totalPages: readNumber(meta, 'totalPages', 'Employee list'),
    },
  }
}

export function readEmployeeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (isRecord(data) && isRecord(data.error) && typeof data.error.message === 'string') {
      return data.error.message
    }

    if (error.message.trim().length > 0) {
      return error.message
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'Employees could not be loaded.'
}

export async function listEmployees(params: EmployeeListParams): Promise<EmployeeListResult> {
  const response = await apiClient.get<unknown>('/employees', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search,
      departmentId: params.departmentId,
      countryId: params.countryId,
      employmentStatus: params.employmentStatus,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  })

  return parseList(response.data)
}

export async function loadEmployeeFilterOptions(): Promise<{
  departments: NamedOption[]
  countries: NamedOption[]
}> {
  const result = await listEmployees({
    page: 1,
    limit: 100,
    sortBy: 'employeeCode',
    sortOrder: 'asc',
  })

  const departments = new Map<number, NamedOption>()
  const countries = new Map<number, NamedOption>()

  for (const employee of result.data) {
    departments.set(employee.department.id, { id: employee.department.id, name: employee.department.name })
    countries.set(employee.country.id, {
      id: employee.country.id,
      name: employee.country.name,
      detail: employee.country.isoCode,
    })
  }

  return {
    departments: [...departments.values()].sort((left, right) => left.name.localeCompare(right.name)),
    countries: [...countries.values()].sort((left, right) => left.name.localeCompare(right.name)),
  }
}
