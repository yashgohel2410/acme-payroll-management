import { EmploymentStatus } from '../generated/prisma/enums.js'
import { prisma } from '../config/database.js'

const SALARY_REVISION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export type DashboardSummary = {
  totalEmployees: number
  activeEmployees: number
  inactiveEmployees: number
  totalDepartments: number
  totalCountries: number
  salaryRevisionsLast30Days: number
}

function countForStatus(
  groups: readonly { employmentStatus: EmploymentStatus; _count: { _all: number } }[],
  status: EmploymentStatus,
): number {
  return groups.find((group) => group.employmentStatus === status)?._count._all ?? 0
}

export async function findDashboardSummary(asOf: Date): Promise<DashboardSummary> {
  const revisionSince = new Date(asOf.getTime() - SALARY_REVISION_WINDOW_MS)

  const [totalEmployees, statusGroups, totalDepartments, totalCountries, salaryRevisionsLast30Days] =
    await Promise.all([
      prisma.employee.count(),
      prisma.employee.groupBy({
        by: ['employmentStatus'],
        _count: { _all: true },
      }),
      prisma.department.count(),
      prisma.country.count(),
      prisma.salaryRevision.count({
        where: { changedAt: { gte: revisionSince } },
      }),
    ])

  return {
    totalEmployees,
    activeEmployees: countForStatus(statusGroups, EmploymentStatus.ACTIVE),
    inactiveEmployees: countForStatus(statusGroups, EmploymentStatus.INACTIVE),
    totalDepartments,
    totalCountries,
    salaryRevisionsLast30Days,
  }
}

export type DepartmentDistribution = {
  name: string
  employeeCount: number
}

export async function findDepartmentDistribution(): Promise<DepartmentDistribution[]> {
  const [departments, activeCounts] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, name: true },
    }),
    prisma.employee.groupBy({
      by: ['departmentId'],
      where: { employmentStatus: EmploymentStatus.ACTIVE },
      _count: { _all: true },
    }),
  ])

  const countByDepartment = new Map(
    activeCounts.map((row) => [row.departmentId, row._count._all]),
  )

  return departments
    .map((department) => ({
      name: department.name,
      employeeCount: countByDepartment.get(department.id) ?? 0,
    }))
    .sort((left, right) => {
      const byCount = right.employeeCount - left.employeeCount
      if (byCount !== 0) {
        return byCount
      }

      return left.name.localeCompare(right.name)
    })
}

export type CountryDistribution = {
  name: string
  isoCode: string
  employeeCount: number
}

export async function findCountryDistribution(): Promise<CountryDistribution[]> {
  const [countries, activeCounts] = await Promise.all([
    prisma.country.findMany({
      select: { id: true, name: true, isoCode: true },
    }),
    prisma.employee.groupBy({
      by: ['countryId'],
      where: { employmentStatus: EmploymentStatus.ACTIVE },
      _count: { _all: true },
    }),
  ])

  const countByCountry = new Map(activeCounts.map((row) => [row.countryId, row._count._all]))

  return countries
    .map((country) => ({
      name: country.name,
      isoCode: country.isoCode,
      employeeCount: countByCountry.get(country.id) ?? 0,
    }))
    .sort((left, right) => {
      const byCount = right.employeeCount - left.employeeCount
      if (byCount !== 0) {
        return byCount
      }

      return left.name.localeCompare(right.name)
    })
}

export type SalaryDistribution = {
  code: string
  employeeCount: number
  totalAmount: number
}

export async function findSalaryDistribution(asOf: Date): Promise<SalaryDistribution[]> {
  const groups = await prisma.salary.groupBy({
    by: ['currencyId'],
    where: {
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      employee: { employmentStatus: { not: EmploymentStatus.INACTIVE } },
    },
    _count: { _all: true },
    _sum: { amount: true },
  })

  if (groups.length === 0) {
    return []
  }

  const currencies = await prisma.currency.findMany({
    where: { id: { in: groups.map((group) => group.currencyId) } },
    select: { id: true, code: true },
  })
  const codeById = new Map(currencies.map((currency) => [currency.id, currency.code]))

  return groups
    .flatMap((group) => {
      const code = codeById.get(group.currencyId)
      if (code === undefined) {
        return []
      }

      return [
        {
          code,
          employeeCount: group._count._all,
          totalAmount: group._sum.amount ?? 0,
        },
      ]
    })
    .sort((left, right) => left.code.localeCompare(right.code))
}

const revisionCurrencySelect = {
  id: true,
  code: true,
  name: true,
  minorUnitDigits: true,
} as const

export type RecentSalaryRevision = {
  id: number
  previousAmount: number
  updatedAmount: number
  changeReason: string
  changedAt: Date
  previousCurrency: {
    id: number
    code: string
    name: string
    minorUnitDigits: number
  }
  updatedCurrency: {
    id: number
    code: string
    name: string
    minorUnitDigits: number
  }
  employee: {
    employeeCode: string
    firstName: string
    lastName: string
  }
}

export async function findRecentSalaryRevisions(limit: number): Promise<RecentSalaryRevision[]> {
  return prisma.salaryRevision.findMany({
    orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: {
      id: true,
      previousAmount: true,
      updatedAmount: true,
      changeReason: true,
      changedAt: true,
      previousCurrency: { select: revisionCurrencySelect },
      updatedCurrency: { select: revisionCurrencySelect },
      employee: {
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}
