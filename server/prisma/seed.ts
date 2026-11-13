import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { EmploymentStatus } from '../src/generated/prisma/enums.js'

const EMPLOYEE_COUNT = 10_000
const INSERT_BATCH_SIZE = 400
const LOOKUP_BATCH_SIZE = 500
const AS_OF = new Date(Date.UTC(2026, 0, 1))
const JOINING_ORIGIN = Date.UTC(2016, 0, 1)
const DAY_MS = 86_400_000

const COUNTRIES = [
  { name: 'India', isoCode: 'IN', dialCode: '91' },
  { name: 'United States', isoCode: 'US', dialCode: '1' },
  { name: 'United Kingdom', isoCode: 'GB', dialCode: '44' },
  { name: 'Germany', isoCode: 'DE', dialCode: '49' },
  { name: 'United Arab Emirates', isoCode: 'AE', dialCode: '971' },
] as const

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Finance',
  'Sales',
  'Operations',
  'Marketing',
  'Legal',
  'Product',
] as const

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', minorUnitDigits: 2 },
  { code: 'USD', name: 'US Dollar', minorUnitDigits: 2 },
  { code: 'GBP', name: 'British Pound', minorUnitDigits: 2 },
  { code: 'EUR', name: 'Euro', minorUnitDigits: 2 },
  { code: 'AED', name: 'UAE Dirham', minorUnitDigits: 2 },
] as const

const COUNTRY_CURRENCY = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  DE: 'EUR',
  AE: 'AED',
} as const

const DESIGNATIONS = {
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'Engineering Manager', 'QA Engineer'],
  'Human Resources': ['HR Generalist', 'HR Business Partner', 'Talent Acquisition Specialist', 'HR Manager'],
  Finance: ['Accountant', 'Financial Analyst', 'Payroll Specialist', 'Finance Manager'],
  Sales: ['Account Executive', 'Sales Manager', 'Business Development Representative', 'Sales Director'],
  Operations: ['Operations Analyst', 'Operations Manager', 'Logistics Coordinator', 'Process Specialist'],
  Marketing: ['Marketing Specialist', 'Content Strategist', 'Brand Manager', 'Marketing Analyst'],
  Legal: ['Legal Counsel', 'Compliance Officer', 'Paralegal', 'Contracts Manager'],
  Product: ['Product Manager', 'Product Analyst', 'Product Designer', 'Associate Product Manager'],
} as const

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Ananya', 'Diya', 'Ishaan', 'Maya', 'Rohan',
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'James',
  'Amelia', 'George', 'Isla', 'Harry', 'Mia', 'Jack', 'Freya', 'Oscar',
  'Hanna', 'Leon', 'Mia', 'Finn', 'Lina', 'Jonas', 'Emma', 'Paul',
  'Fatima', 'Omar', 'Aisha', 'Yusuf', 'Layla', 'Hassan', 'Noor', 'Zayn',
] as const

const LAST_NAMES = [
  'Sharma', 'Patel', 'Iyer', 'Reddy', 'Kapoor', 'Mehta', 'Nair', 'Singh',
  'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
  'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Green', 'Hall', 'Clarke',
  'Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann',
  'Khan', 'Rahman', 'Hassan', 'Farooq', 'Saeed', 'Qureshi', 'Malik', 'Abdullah',
] as const

const STATUS_CYCLE = [
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.ACTIVE,
  EmploymentStatus.INACTIVE,
  EmploymentStatus.ON_LEAVE,
  EmploymentStatus.TERMINATED,
  EmploymentStatus.ACTIVE,
] as const

type SalaryDraft = {
  employeeId: number
  amount: number
  currencyId: number
  effectiveFrom: Date
  effectiveTo: Date | null
}

const databaseUrl = process.env.DATABASE_URL

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL is required to seed the database.')
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
})

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }

  return batches
}

function employeeCode(sequence: number): string {
  return `EMP${String(sequence).padStart(5, '0')}`
}

function dateOfJoining(sequence: number): Date {
  const dayOffset = (sequence * 17) % (365 * 9)
  return new Date(JOINING_ORIGIN + dayOffset * DAY_MS)
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date.getTime())
  next.setUTCFullYear(next.getUTCFullYear() + years)
  return next
}

function salaryAmount(currencyCode: string, sequence: number): number {
  const step = sequence % 40

  switch (currencyCode) {
    case 'INR':
      return 4_500_000 + step * 125_000
    case 'USD':
      return 450_000 + step * 12_500
    case 'GBP':
      return 380_000 + step * 10_000
    case 'EUR':
      return 400_000 + step * 10_000
    case 'AED':
      return 1_650_000 + step * 40_000
    default:
      return 500_000 + step * 10_000
  }
}

function salaryKey(employeeId: number, effectiveFrom: Date): string {
  return `${employeeId}:${effectiveFrom.getTime()}`
}

async function seedReferenceData(): Promise<{
  countryIds: Map<string, number>
  departmentIds: Map<string, number>
  currencyIds: Map<string, number>
}> {
  const countryIds = new Map<string, number>()
  const departmentIds = new Map<string, number>()
  const currencyIds = new Map<string, number>()

  for (const country of COUNTRIES) {
    const saved = await prisma.country.upsert({
      where: { isoCode: country.isoCode },
      update: { name: country.name },
      create: { name: country.name, isoCode: country.isoCode },
    })
    countryIds.set(country.isoCode, saved.id)
  }

  for (const name of DEPARTMENTS) {
    const saved = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    departmentIds.set(name, saved.id)
  }

  for (const currency of CURRENCIES) {
    const saved = await prisma.currency.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        minorUnitDigits: currency.minorUnitDigits,
      },
      create: currency,
    })
    currencyIds.set(currency.code, saved.id)
  }

  return { countryIds, departmentIds, currencyIds }
}

async function seedEmployees(
  countryIds: Map<string, number>,
  departmentIds: Map<string, number>,
): Promise<number> {
  const employees: {
    employeeCode: string
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfJoining: Date
    designation: string
    employmentStatus: (typeof STATUS_CYCLE)[number]
    countryId: number
    departmentId: number
  }[] = []

  for (let sequence = 1; sequence <= EMPLOYEE_COUNT; sequence += 1) {
    const country = COUNTRIES[(sequence - 1) % COUNTRIES.length]
    const departmentName = DEPARTMENTS[(sequence - 1) % DEPARTMENTS.length]
    const countryId = countryIds.get(country.isoCode)
    const departmentId = departmentIds.get(departmentName)

    if (countryId === undefined || departmentId === undefined) {
      throw new Error('Reference data is missing a country or department id.')
    }

    const firstName = FIRST_NAMES[(sequence - 1) % FIRST_NAMES.length]
    const lastName = LAST_NAMES[Math.floor((sequence - 1) / FIRST_NAMES.length) % LAST_NAMES.length]
    const code = employeeCode(sequence)
    const titles = DESIGNATIONS[departmentName]
    const designation = titles[(sequence - 1) % titles.length]
    const status = STATUS_CYCLE[(sequence - 1) % STATUS_CYCLE.length]

    if (designation === undefined || status === undefined) {
      throw new Error('Unable to resolve a designation or employment status.')
    }

    employees.push({
      employeeCode: code,
      firstName,
      lastName,
      email: `${firstName}.${lastName}.${code}@acme-payroll.example`.toLowerCase(),
      phone: `+${country.dialCode}${String(8_000_000_000 + sequence)}`,
      dateOfJoining: dateOfJoining(sequence),
      designation,
      employmentStatus: status,
      countryId,
      departmentId,
    })
  }

  const existing = await prisma.employee.findMany({
    where: {
      employeeCode: {
        gte: employeeCode(1),
        lte: employeeCode(EMPLOYEE_COUNT),
      },
    },
    select: { employeeCode: true },
  })
  const existingCodes = new Set(existing.map((employee) => employee.employeeCode))
  const missing = employees.filter((employee) => !existingCodes.has(employee.employeeCode))

  let inserted = 0

  for (const batch of chunk(missing, INSERT_BATCH_SIZE)) {
    const result = await prisma.employee.createMany({ data: batch })
    inserted += result.count
  }

  return inserted
}

async function seedSalaries(currencyIds: Map<string, number>): Promise<number> {
  const codes = Array.from({ length: EMPLOYEE_COUNT }, (_, index) => employeeCode(index + 1))
  const employees: { id: number; employeeCode: string; countryId: number; dateOfJoining: Date }[] = []

  for (const batch of chunk(codes, LOOKUP_BATCH_SIZE)) {
    const rows = await prisma.employee.findMany({
      where: { employeeCode: { in: batch } },
      select: {
        id: true,
        employeeCode: true,
        countryId: true,
        dateOfJoining: true,
      },
    })
    employees.push(...rows)
  }

  const countryCodeById = new Map<number, string>()
  for (const country of COUNTRIES) {
    const id = await prisma.country.findUnique({
      where: { isoCode: country.isoCode },
      select: { id: true },
    })
    if (id !== null) {
      countryCodeById.set(id.id, country.isoCode)
    }
  }

  const drafts: SalaryDraft[] = []

  for (const employee of employees) {
    const sequence = Number(employee.employeeCode.slice(3))
    const countryCode = countryCodeById.get(employee.countryId)
    if (countryCode === undefined) {
      throw new Error(`Employee ${employee.employeeCode} has an unknown country.`)
    }

    const currencyCode = COUNTRY_CURRENCY[countryCode as keyof typeof COUNTRY_CURRENCY]
    const currencyId = currencyIds.get(currencyCode)
    if (currencyId === undefined) {
      throw new Error(`Currency ${currencyCode} was not seeded.`)
    }

    const currentAmount = salaryAmount(currencyCode, sequence)
    const currentStart = addYears(employee.dateOfJoining, 2)

    if (currentStart.getTime() <= AS_OF.getTime()) {
      drafts.push({
        employeeId: employee.id,
        amount: Math.floor((currentAmount * 9) / 10),
        currencyId,
        effectiveFrom: employee.dateOfJoining,
        effectiveTo: new Date(currentStart.getTime() - DAY_MS),
      })
      drafts.push({
        employeeId: employee.id,
        amount: currentAmount,
        currencyId,
        effectiveFrom: currentStart,
        effectiveTo: null,
      })
    } else {
      drafts.push({
        employeeId: employee.id,
        amount: currentAmount,
        currencyId,
        effectiveFrom: employee.dateOfJoining,
        effectiveTo: null,
      })
    }
  }

  const existingKeys = new Set<string>()

  for (const batch of chunk(employees, LOOKUP_BATCH_SIZE)) {
    const rows = await prisma.salary.findMany({
      where: { employeeId: { in: batch.map((employee) => employee.id) } },
      select: { employeeId: true, effectiveFrom: true },
    })

    for (const row of rows) {
      existingKeys.add(salaryKey(row.employeeId, row.effectiveFrom))
    }
  }

  const missing = drafts.filter(
    (draft) => !existingKeys.has(salaryKey(draft.employeeId, draft.effectiveFrom)),
  )

  let inserted = 0

  for (const batch of chunk(missing, INSERT_BATCH_SIZE)) {
    const result = await prisma.salary.createMany({ data: batch })
    inserted += result.count
  }

  return inserted
}

async function reportCounts(): Promise<void> {
  const employeeCodes = {
    gte: employeeCode(1),
    lte: employeeCode(EMPLOYEE_COUNT),
  }

  const [countries, departments, currencies, employees, salaries] = await Promise.all([
    prisma.country.count({
      where: { isoCode: { in: COUNTRIES.map((country) => country.isoCode) } },
    }),
    prisma.department.count({
      where: { name: { in: [...DEPARTMENTS] } },
    }),
    prisma.currency.count({
      where: { code: { in: CURRENCIES.map((currency) => currency.code) } },
    }),
    prisma.employee.count({
      where: { employeeCode: employeeCodes },
    }),
    prisma.salary.count({
      where: { employee: { employeeCode: employeeCodes } },
    }),
  ])

  console.log(
    JSON.stringify(
      {
        countries,
        departments,
        currencies,
        employees,
        salaries,
      },
      null,
      2,
    ),
  )
}

async function main(): Promise<void> {
  const reference = await seedReferenceData()
  const insertedEmployees = await seedEmployees(reference.countryIds, reference.departmentIds)
  const insertedSalaries = await seedSalaries(reference.currencyIds)

  console.log(`Inserted employees this run: ${insertedEmployees}`)
  console.log(`Inserted salary records this run: ${insertedSalaries}`)
  await reportCounts()
}

try {
  await main()
} catch (error: unknown) {
  console.error(error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
