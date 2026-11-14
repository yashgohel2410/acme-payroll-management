import {
  findCountryDistribution,
  findDashboardSummary,
  findDepartmentDistribution,
  findRecentSalaryRevisions,
  findSalaryDistribution,
  type CountryDistribution,
  type DashboardSummary,
  type DepartmentDistribution,
  type RecentSalaryRevision,
  type SalaryDistribution,
} from '../repositories/dashboard.repository.js'

export async function summarizeDashboard(): Promise<DashboardSummary> {
  return findDashboardSummary(new Date())
}

export async function listDepartmentDistribution(): Promise<DepartmentDistribution[]> {
  return findDepartmentDistribution()
}

export async function listCountryDistribution(): Promise<CountryDistribution[]> {
  return findCountryDistribution()
}

export async function listSalaryDistribution(): Promise<SalaryDistribution[]> {
  return findSalaryDistribution(new Date())
}

export async function listRecentRevisions(limit: number): Promise<RecentSalaryRevision[]> {
  return findRecentSalaryRevisions(limit)
}
