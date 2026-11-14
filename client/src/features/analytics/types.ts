import type {
  CountryDistribution,
  DashboardSummary,
  DepartmentDistribution,
  SalaryDistribution,
} from '../dashboard/types.ts'

export type AnalyticsData = {
  summary: DashboardSummary
  departments: DepartmentDistribution[]
  countries: CountryDistribution[]
  salaries: SalaryDistribution[]
}
