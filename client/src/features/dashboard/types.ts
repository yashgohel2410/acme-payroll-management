export type DashboardSummary = {
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number
  totalDepartments: number
  totalCountries: number
  salaryRevisionsLast30Days: number
}

export type DepartmentDistribution = {
  name: string
  employeeCount: number
}

export type CountryDistribution = {
  name: string
  isoCode: string
  employeeCount: number
}

export type SalaryDistribution = {
  code: string
  employeeCount: number
  totalAmount: number
}

export type RevisionCurrency = {
  id: number
  code: string
  name: string
  minorUnitDigits: number
}

export type RecentRevision = {
  id: number
  previousAmount: number
  updatedAmount: number
  changeReason: string
  changedAt: string
  previousCurrency: RevisionCurrency
  updatedCurrency: RevisionCurrency
  employee: {
    employeeCode: string
    firstName: string
    lastName: string
  }
}

export type DashboardData = {
  summary: DashboardSummary
  departments: DepartmentDistribution[]
  countries: CountryDistribution[]
  salaries: SalaryDistribution[]
  revisions: RecentRevision[]
}
