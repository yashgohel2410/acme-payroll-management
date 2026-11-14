import axios from 'axios'
import { apiClient } from '../../../services/api/httpClient.ts'
import type {
  CountryDistribution,
  DashboardData,
  DashboardSummary,
  DepartmentDistribution,
  RecentRevision,
  RevisionCurrency,
  SalaryDistribution,
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

function readData(value: unknown, label: string): unknown {
  const record = readRecord(value, label)
  if (!('data' in record)) {
    throw new Error(`${label} response is missing data.`)
  }

  return record.data
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

function readArray(value: unknown, label: string): unknown[] {
  const data = readData(value, label)
  if (!Array.isArray(data)) {
    throw new Error(`${label} response data is not a list.`)
  }

  return data
}

function parseSummary(value: unknown): DashboardSummary {
  const data = readRecord(readData(value, 'Dashboard summary'), 'Dashboard summary')

  return {
    totalEmployees: readNumber(data, 'totalEmployees', 'Dashboard summary'),
    activeEmployees: readNumber(data, 'activeEmployees', 'Dashboard summary'),
    inactiveEmployees: readNumber(data, 'inactiveEmployees', 'Dashboard summary'),
    totalDepartments: readNumber(data, 'totalDepartments', 'Dashboard summary'),
    totalCountries: readNumber(data, 'totalCountries', 'Dashboard summary'),
    salaryRevisionsLast30Days: readNumber(data, 'salaryRevisionsLast30Days', 'Dashboard summary'),
  }
}

function parseDepartments(value: unknown): DepartmentDistribution[] {
  return readArray(value, 'Department distribution').map((item) => {
    const record = readRecord(item, 'Department distribution')
    return {
      name: readString(record, 'name', 'Department distribution'),
      employeeCount: readNumber(record, 'employeeCount', 'Department distribution'),
    }
  })
}

function parseCountries(value: unknown): CountryDistribution[] {
  return readArray(value, 'Country distribution').map((item) => {
    const record = readRecord(item, 'Country distribution')
    return {
      name: readString(record, 'name', 'Country distribution'),
      isoCode: readString(record, 'isoCode', 'Country distribution'),
      employeeCount: readNumber(record, 'employeeCount', 'Country distribution'),
    }
  })
}

function parseSalaries(value: unknown): SalaryDistribution[] {
  return readArray(value, 'Salary distribution').map((item) => {
    const record = readRecord(item, 'Salary distribution')
    return {
      code: readString(record, 'code', 'Salary distribution'),
      employeeCount: readNumber(record, 'employeeCount', 'Salary distribution'),
      totalAmount: readNumber(record, 'totalAmount', 'Salary distribution'),
    }
  })
}

function parseCurrency(value: unknown, label: string): RevisionCurrency {
  const record = readRecord(value, label)
  return {
    id: readNumber(record, 'id', label),
    code: readString(record, 'code', label),
    name: readString(record, 'name', label),
    minorUnitDigits: readNumber(record, 'minorUnitDigits', label),
  }
}

function parseRevisions(value: unknown): RecentRevision[] {
  return readArray(value, 'Recent revisions').map((item) => {
    const record = readRecord(item, 'Recent revisions')
    const employee = readRecord(record.employee, 'Recent revisions')

    return {
      id: readNumber(record, 'id', 'Recent revisions'),
      previousAmount: readNumber(record, 'previousAmount', 'Recent revisions'),
      updatedAmount: readNumber(record, 'updatedAmount', 'Recent revisions'),
      changeReason: readString(record, 'changeReason', 'Recent revisions'),
      changedAt: readString(record, 'changedAt', 'Recent revisions'),
      previousCurrency: parseCurrency(record.previousCurrency, 'Previous currency'),
      updatedCurrency: parseCurrency(record.updatedCurrency, 'Updated currency'),
      employee: {
        employeeCode: readString(employee, 'employeeCode', 'Recent revisions'),
        firstName: readString(employee, 'firstName', 'Recent revisions'),
        lastName: readString(employee, 'lastName', 'Recent revisions'),
      },
    }
  })
}

export function readApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const body: unknown = data.error
      if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') {
        return body.message
      }
    }

    if (error.message.trim().length > 0) {
      return error.message
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'The dashboard could not be loaded.'
}

export async function loadDashboard(): Promise<DashboardData> {
  const [summary, departments, countries, salaries, revisions] = await Promise.all([
    apiClient.get<unknown>('/dashboard/summary'),
    apiClient.get<unknown>('/dashboard/department-distribution'),
    apiClient.get<unknown>('/dashboard/country-distribution'),
    apiClient.get<unknown>('/dashboard/salary-distribution'),
    apiClient.get<unknown>('/dashboard/recent-revisions'),
  ])

  return {
    summary: parseSummary(summary.data),
    departments: parseDepartments(departments.data),
    countries: parseCountries(countries.data),
    salaries: parseSalaries(salaries.data),
    revisions: parseRevisions(revisions.data),
  }
}
