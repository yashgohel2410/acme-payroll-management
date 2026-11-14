import { apiClient } from '../../../services/api/httpClient.ts'
import {
  parseCountries,
  parseDepartments,
  parseSalaries,
  parseSummary,
  readApiErrorMessage,
} from '../../dashboard/services/dashboardApi.ts'
import type { AnalyticsData } from '../types.ts'

export async function loadAnalytics(): Promise<AnalyticsData> {
  const [summary, departments, countries, salaries] = await Promise.all([
    apiClient.get<unknown>('/dashboard/summary'),
    apiClient.get<unknown>('/dashboard/department-distribution'),
    apiClient.get<unknown>('/dashboard/country-distribution'),
    apiClient.get<unknown>('/dashboard/salary-distribution'),
  ])

  return {
    summary: parseSummary(summary.data),
    departments: parseDepartments(departments.data),
    countries: parseCountries(countries.data),
    salaries: parseSalaries(salaries.data),
  }
}

export function readAnalyticsError(error: unknown): string {
  return readApiErrorMessage(error, 'Analytics could not be loaded.')
}
