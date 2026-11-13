import { Prisma } from '../generated/prisma/client.js'
import type { EmploymentStatus } from '../generated/prisma/enums.js'
import { prisma } from '../config/database.js'
import type { EmployeeListQuery } from '../validators/employeeListQuery.js'

export type ListedEmployee = {
  id: number
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  dateOfJoining: Date
  designation: string
  employmentStatus: EmploymentStatus
  country: {
    id: number
    name: string
    isoCode: string
  }
  department: {
    id: number
    name: string
  }
  currentSalary: {
    amount: number
    currency: {
      id: number
      code: string
      name: string
      minorUnitDigits: number
    }
  } | null
}

type EmployeeListRow = {
  id: number
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  dateOfJoining: Date
  designation: string
  employmentStatus: EmploymentStatus
  country: ListedEmployee['country']
  department: ListedEmployee['department']
  salaries: {
    amount: number
    currency: NonNullable<ListedEmployee['currentSalary']>['currency']
  }[]
}

function buildWhere(query: EmployeeListQuery): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {}

  if (query.departmentId !== undefined) {
    where.departmentId = query.departmentId
  }

  if (query.countryId !== undefined) {
    where.countryId = query.countryId
  }

  if (query.employmentStatus !== undefined) {
    where.employmentStatus = query.employmentStatus
  }

  if (query.search !== undefined) {
    where.OR = [
      { employeeCode: { contains: query.search } },
      { firstName: { contains: query.search } },
      { lastName: { contains: query.search } },
      { email: { contains: query.search } },
    ]
  }

  return where
}

function buildOrderBy(
  sortBy: EmployeeListQuery['sortBy'],
  sortOrder: EmployeeListQuery['sortOrder'],
): Prisma.EmployeeOrderByWithRelationInput[] {
  const tieBreak = { id: 'asc' as const }

  switch (sortBy) {
    case 'employeeCode':
      return [{ employeeCode: sortOrder }, tieBreak]
    case 'firstName':
      return [{ firstName: sortOrder }, tieBreak]
    case 'lastName':
      return [{ lastName: sortOrder }, tieBreak]
    case 'email':
      return [{ email: sortOrder }, tieBreak]
    case 'dateOfJoining':
      return [{ dateOfJoining: sortOrder }, tieBreak]
    case 'designation':
      return [{ designation: sortOrder }, tieBreak]
    case 'employmentStatus':
      return [{ employmentStatus: sortOrder }, tieBreak]
    default: {
      const unsupported: never = sortBy
      throw new Error(`Unsupported sort field: ${unsupported}`)
    }
  }
}

function toListedEmployee(row: EmployeeListRow): ListedEmployee {
  const currentSalary = row.salaries[0]

  return {
    id: row.id,
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    dateOfJoining: row.dateOfJoining,
    designation: row.designation,
    employmentStatus: row.employmentStatus,
    country: row.country,
    department: row.department,
    currentSalary:
      currentSalary === undefined
        ? null
        : {
            amount: currentSalary.amount,
            currency: currentSalary.currency,
          },
  }
}

export async function findEmployeePage(
  query: EmployeeListQuery,
  asOf: Date,
): Promise<{ total: number; employees: ListedEmployee[] }> {
  const where = buildWhere(query)
  const skip = (query.page - 1) * query.limit

  const [total, rows] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: buildOrderBy(query.sortBy, query.sortOrder),
      skip,
      take: query.limit,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfJoining: true,
        designation: true,
        employmentStatus: true,
        country: {
          select: { id: true, name: true, isoCode: true },
        },
        department: {
          select: { id: true, name: true },
        },
        salaries: {
          where: {
            effectiveFrom: { lte: asOf },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          select: {
            amount: true,
            currency: {
              select: { id: true, code: true, name: true, minorUnitDigits: true },
            },
          },
        },
      },
    }),
  ])

  return {
    total,
    employees: rows.map((row) => toListedEmployee(row)),
  }
}

export type SalaryRecord = {
  id: number
  amount: number
  effectiveFrom: Date
  effectiveTo: Date | null
  currency: NonNullable<ListedEmployee['currentSalary']>['currency']
}

export type SalaryRevisionRecord = {
  id: number
  salaryId: number
  previousAmount: number
  updatedAmount: number
  changeReason: string
  changedAt: Date
  previousCurrency: SalaryRecord['currency']
  updatedCurrency: SalaryRecord['currency']
}

export type EmployeeDetails = Omit<ListedEmployee, 'currentSalary'> & {
  currentSalary: SalaryRecord | null
  salaryHistory: SalaryRecord[]
  salaryRevisions: SalaryRevisionRecord[]
}

export type EmployeeLookup = {
  id?: number
  employeeCode?: string
}

const currencySelect = {
  id: true,
  code: true,
  name: true,
  minorUnitDigits: true,
} as const

function isCurrentSalary(salary: SalaryRecord, asOf: Date): boolean {
  return (
    salary.effectiveFrom.getTime() <= asOf.getTime() &&
    (salary.effectiveTo === null || salary.effectiveTo.getTime() >= asOf.getTime())
  )
}

function lookupWhere(lookup: EmployeeLookup): Prisma.EmployeeWhereInput {
  if (lookup.id !== undefined) {
    return { id: lookup.id }
  }

  if (lookup.employeeCode !== undefined) {
    return { employeeCode: lookup.employeeCode }
  }

  throw new Error('Employee lookup requires an id or employee code')
}

export async function findEmployee(
  lookup: EmployeeLookup,
  asOf: Date,
): Promise<EmployeeDetails | null> {
  const where = lookupWhere(lookup)

  const row = await prisma.employee.findFirst({
    where,
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfJoining: true,
      designation: true,
      employmentStatus: true,
      country: { select: { id: true, name: true, isoCode: true } },
      department: { select: { id: true, name: true } },
      salaries: {
        orderBy: { effectiveFrom: 'desc' },
        select: {
          id: true,
          amount: true,
          effectiveFrom: true,
          effectiveTo: true,
          currency: { select: currencySelect },
        },
      },
      salaryRevisions: {
        orderBy: { changedAt: 'desc' },
        select: {
          id: true,
          salaryId: true,
          previousAmount: true,
          updatedAmount: true,
          changeReason: true,
          changedAt: true,
          previousCurrency: { select: currencySelect },
          updatedCurrency: { select: currencySelect },
        },
      },
    },
  })

  if (row === null) {
    return null
  }

  const currentSalary = row.salaries.find((salary) => isCurrentSalary(salary, asOf)) ?? null

  return {
    id: row.id,
    employeeCode: row.employeeCode,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    dateOfJoining: row.dateOfJoining,
    designation: row.designation,
    employmentStatus: row.employmentStatus,
    country: row.country,
    department: row.department,
    currentSalary,
    salaryHistory: row.salaries,
    salaryRevisions: row.salaryRevisions,
  }
}
