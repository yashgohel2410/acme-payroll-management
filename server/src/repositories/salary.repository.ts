import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../config/database.js'
import {
  EmployeeNotFoundError,
  EmployeeReferenceNotFoundError,
} from './employee.repository.js'
import type { EmployeeLookup } from './employee.repository.js'
import type { CreateSalaryRevisionInput } from '../validators/createSalaryRevision.js'
import type { SalaryListQuery } from '../validators/salaryListQuery.js'

export type ListedSalary = {
  id: number
  amount: number
  effectiveFrom: Date
  effectiveTo: Date | null
  currency: {
    id: number
    code: string
    name: string
    minorUnitDigits: number
  }
  employee: {
    id: number
    employeeCode: string
    firstName: string
    lastName: string
    email: string
    department: {
      id: number
      name: string
    }
    country: {
      id: number
      name: string
      isoCode: string
    }
  }
}

function buildWhere(query: SalaryListQuery): Prisma.SalaryWhereInput {
  const where: Prisma.SalaryWhereInput = {}
  const employee: Prisma.EmployeeWhereInput = {}

  if (query.departmentId !== undefined) {
    employee.departmentId = query.departmentId
  }

  if (query.countryId !== undefined) {
    employee.countryId = query.countryId
  }

  if (query.search !== undefined) {
    employee.OR = [
      { employeeCode: { contains: query.search } },
      { firstName: { contains: query.search } },
      { lastName: { contains: query.search } },
      { email: { contains: query.search } },
    ]
  }

  if (query.departmentId !== undefined || query.countryId !== undefined || query.search !== undefined) {
    where.employee = employee
  }

  if (query.currencyId !== undefined) {
    where.currencyId = query.currencyId
  }

  if (query.effectiveDate !== undefined) {
    where.effectiveFrom = { lte: query.effectiveDate }
    where.OR = [{ effectiveTo: null }, { effectiveTo: { gte: query.effectiveDate } }]
  }

  return where
}

function buildOrderBy(
  sortBy: SalaryListQuery['sortBy'],
  sortOrder: SalaryListQuery['sortOrder'],
): Prisma.SalaryOrderByWithRelationInput[] {
  const tieBreak = { id: sortOrder }

  switch (sortBy) {
    case 'amount':
      return [{ amount: sortOrder }, tieBreak]
    case 'effectiveFrom':
      return [{ effectiveFrom: sortOrder }, tieBreak]
    case 'effectiveTo':
      return [{ effectiveTo: sortOrder }, tieBreak]
    default: {
      const unsupported: never = sortBy
      throw new Error(`Unsupported sort field: ${unsupported}`)
    }
  }
}

export async function findSalaryPage(
  query: SalaryListQuery,
): Promise<{ totalRecords: number; salaries: ListedSalary[] }> {
  const where = buildWhere(query)
  const skip = (query.page - 1) * query.limit

  const [totalRecords, salaries] = await Promise.all([
    prisma.salary.count({ where }),
    prisma.salary.findMany({
      where,
      orderBy: buildOrderBy(query.sortBy, query.sortOrder),
      skip,
      take: query.limit,
      select: {
        id: true,
        amount: true,
        effectiveFrom: true,
        effectiveTo: true,
        currency: {
          select: { id: true, code: true, name: true, minorUnitDigits: true },
        },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { id: true, name: true } },
            country: { select: { id: true, name: true, isoCode: true } },
          },
        },
      },
    }),
  ])

  return { totalRecords, salaries }
}

const revisionCurrencySelect = {
  id: true,
  code: true,
  name: true,
  minorUnitDigits: true,
} as const

export type CreatedSalaryRevision = {
  id: number
  salaryId: number
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
  salary: {
    id: number
    amount: number
    effectiveFrom: Date
    effectiveTo: Date | null
    currency: {
      id: number
      code: string
      name: string
      minorUnitDigits: number
    }
  }
}

export class EmployeeInactiveError extends Error {
  constructor() {
    super('Inactive employees cannot receive a salary revision')
    this.name = 'EmployeeInactiveError'
  }
}

export class SalaryOverlapError extends Error {
  constructor() {
    super('Salary periods must not overlap')
    this.name = 'SalaryOverlapError'
  }
}

export class SalaryRevisionUnavailableError extends Error {
  constructor() {
    super('Employee has no salary to revise')
    this.name = 'SalaryRevisionUnavailableError'
  }
}

export class SalaryRevisionConflictError extends Error {
  constructor() {
    super('Salary revision conflicted with a concurrent update')
    this.name = 'SalaryRevisionConflictError'
  }
}

type SalaryPeriod = {
  id: number
  amount: number
  currencyId: number
  effectiveFrom: Date
  effectiveTo: Date | null
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

function dayBefore(date: Date): Date {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000)
}

function periodsOverlap(
  leftFrom: Date,
  leftTo: Date | null,
  rightFrom: Date,
  rightTo: Date | null,
): boolean {
  const leftEnd = leftTo?.getTime() ?? Number.POSITIVE_INFINITY
  const rightEnd = rightTo?.getTime() ?? Number.POSITIVE_INFINITY
  return leftFrom.getTime() <= rightEnd && rightFrom.getTime() <= leftEnd
}

function revisionPlan(salaries: readonly SalaryPeriod[], effectiveFrom: Date): {
  previous: SalaryPeriod
  closeOn: Date | null
} {
  if (salaries.length === 0) {
    throw new SalaryRevisionUnavailableError()
  }

  const closeOn = dayBefore(effectiveFrom)
  let previous: SalaryPeriod | null = null

  for (const salary of salaries) {
    if (salary.effectiveFrom.getTime() < effectiveFrom.getTime()) {
      if (previous === null || salary.effectiveFrom.getTime() > previous.effectiveFrom.getTime()) {
        previous = salary
      }
    }
  }

  if (previous === null) {
    throw new SalaryOverlapError()
  }

  if (previous.effectiveTo !== null && previous.effectiveTo.getTime() >= effectiveFrom.getTime()) {
    throw new SalaryOverlapError()
  }

  if (closeOn.getTime() < previous.effectiveFrom.getTime()) {
    throw new SalaryOverlapError()
  }

  const closingId = previous.effectiveTo === null ? previous.id : null

  for (const salary of salaries) {
    if (salary.id === closingId) {
      continue
    }

    if (periodsOverlap(salary.effectiveFrom, salary.effectiveTo, effectiveFrom, null)) {
      throw new SalaryOverlapError()
    }
  }

  return {
    previous,
    closeOn: closingId === null ? null : closeOn,
  }
}

async function createSalaryRevisionOnce(
  lookup: EmployeeLookup,
  input: CreateSalaryRevisionInput,
): Promise<CreatedSalaryRevision> {
  return prisma.$transaction(
    async (transaction) => {
      const employee = await transaction.employee.findFirst({
        where: lookupWhere(lookup),
        select: { id: true, employmentStatus: true },
      })

      if (employee === null) {
        throw new EmployeeNotFoundError()
      }

      if (employee.employmentStatus === 'INACTIVE') {
        throw new EmployeeInactiveError()
      }

      await transaction.employee.update({
        where: { id: employee.id },
        data: { employmentStatus: employee.employmentStatus },
      })

      const [currency, salaries] = await Promise.all([
        transaction.currency.findUnique({
          where: { id: input.currencyId },
          select: revisionCurrencySelect,
        }),
        transaction.salary.findMany({
          where: { employeeId: employee.id },
          select: {
            id: true,
            amount: true,
            currencyId: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        }),
      ])

      if (currency === null) {
        throw new EmployeeReferenceNotFoundError(['currencyId'])
      }

      const plan = revisionPlan(salaries, input.effectiveFrom)

      if (plan.closeOn !== null) {
        const closed = await transaction.salary.updateMany({
          where: {
            id: plan.previous.id,
            employeeId: employee.id,
            effectiveFrom: plan.previous.effectiveFrom,
            effectiveTo: null,
          },
          data: { effectiveTo: plan.closeOn },
        })

        if (closed.count !== 1) {
          throw new SalaryRevisionConflictError()
        }
      }

      const freshSalaries = await transaction.salary.findMany({
        where: { employeeId: employee.id },
        select: {
          id: true,
          amount: true,
          currencyId: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      })
      revisionPlan(freshSalaries, input.effectiveFrom)

      const salary = await transaction.salary.create({
        data: {
          employeeId: employee.id,
          amount: input.amount,
          currencyId: currency.id,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: null,
        },
        select: {
          id: true,
          amount: true,
          effectiveFrom: true,
          effectiveTo: true,
          currency: { select: revisionCurrencySelect },
        },
      })

      const revision = await transaction.salaryRevision.create({
        data: {
          employeeId: employee.id,
          salaryId: salary.id,
          previousAmount: plan.previous.amount,
          updatedAmount: input.amount,
          previousCurrencyId: plan.previous.currencyId,
          updatedCurrencyId: currency.id,
          changeReason: input.reason,
          changedAt: new Date(),
        },
        select: {
          id: true,
          salaryId: true,
          previousAmount: true,
          updatedAmount: true,
          changeReason: true,
          changedAt: true,
          previousCurrency: { select: revisionCurrencySelect },
          updatedCurrency: { select: revisionCurrencySelect },
        },
      })

      return {
        ...revision,
        salary,
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

export async function createSalaryRevisionRecord(
  lookup: EmployeeLookup,
  input: CreateSalaryRevisionInput,
): Promise<CreatedSalaryRevision> {
  const attempts = 3

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await createSalaryRevisionOnce(lookup, input)
    } catch (error: unknown) {
      if (error instanceof SalaryRevisionConflictError && attempt < attempts) {
        continue
      }

      throw error
    }
  }

  throw new SalaryRevisionConflictError()
}
