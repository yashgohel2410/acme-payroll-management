import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-employees-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'employees.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5055'

execSync(`npx prisma db push --url "${databaseUrl}"`, {
  cwd: serverRoot,
  env: process.env,
  stdio: 'pipe',
})

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/config/database.js')

const app = createApp()

type EmployeeResponse = {
  data: {
    employeeCode: string
    firstName: string
    lastName: string
    email: string
    employmentStatus: string
    department: { id: number; name: string }
    country: { id: number; isoCode: string }
    currentSalary: { amount: number; currency: { code: string } } | null
  }[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function readBody(value: unknown): EmployeeResponse {
  if (typeof value !== 'object' || value === null || !('data' in value) || !('meta' in value)) {
    throw new Error('Expected an employee list response')
  }

  return value as EmployeeResponse
}

beforeAll(async () => {
  const india = await prisma.country.create({ data: { name: 'India', isoCode: 'IN' } })
  const unitedStates = await prisma.country.create({
    data: { name: 'United States', isoCode: 'US' },
  })
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } })
  const finance = await prisma.department.create({ data: { name: 'Finance' } })
  const inr = await prisma.currency.create({
    data: { code: 'INR', name: 'Indian Rupee', minorUnitDigits: 2 },
  })
  const usd = await prisma.currency.create({
    data: { code: 'USD', name: 'US Dollar', minorUnitDigits: 2 },
  })

  for (let sequence = 1; sequence <= 25; sequence += 1) {
    const code = `LST${String(sequence).padStart(3, '0')}`
    const country = sequence <= 12 ? india : unitedStates
    const department = sequence <= 10 ? engineering : finance
    const currency = country.isoCode === 'IN' ? inr : usd
    const employmentStatus =
      sequence === 25 ? 'TERMINATED' : sequence === 24 ? 'ON_LEAVE' : sequence === 23 ? 'INACTIVE' : 'ACTIVE'
    const firstName = sequence === 7 ? 'Searchable' : `First${String(sequence).padStart(2, '0')}`
    const lastName = sequence === 8 ? 'Needle' : `Last${String(sequence).padStart(2, '0')}`
    const email = sequence === 9 ? 'find.me@acme.test' : `${code.toLowerCase()}@acme.test`

    const employee = await prisma.employee.create({
      data: {
        employeeCode: code,
        firstName,
        lastName,
        email,
        phone: `+1555000${String(sequence).padStart(4, '0')}`,
        dateOfJoining: new Date(Date.UTC(2020, 0, sequence)),
        designation: department.name === 'Engineering' ? 'Software Engineer' : 'Accountant',
        employmentStatus,
        countryId: country.id,
        departmentId: department.id,
      },
    })

    if (sequence !== 23) {
      const currentSalary = await prisma.salary.create({
        data: {
          employeeId: employee.id,
          amount: 5_000_000 + sequence,
          currencyId: currency.id,
          effectiveFrom: new Date(Date.UTC(2020, 0, sequence)),
          effectiveTo: null,
        },
      })

      if (sequence === 1) {
        const previousSalary = await prisma.salary.create({
          data: {
            employeeId: employee.id,
            amount: 4_000_000,
            currencyId: currency.id,
            effectiveFrom: new Date(Date.UTC(2019, 0, 1)),
            effectiveTo: new Date(Date.UTC(2019, 11, 31)),
          },
        })
        await prisma.salaryRevision.create({
          data: {
            employeeId: employee.id,
            salaryId: currentSalary.id,
            previousAmount: previousSalary.amount,
            updatedAmount: currentSalary.amount,
            previousCurrencyId: currency.id,
            updatedCurrencyId: currency.id,
            changeReason: 'Annual review',
            changedAt: new Date(Date.UTC(2020, 0, 1)),
          },
        })
      }
    }
  }
})

afterAll(async () => {
  await prisma.$disconnect()
  rmSync(databaseDirectory, { recursive: true, force: true })
})

describe('GET /api/employees', () => {
  it('paginates results and returns metadata', async () => {
    const first = readBody(
      (await request(app).get('/api/employees').query({ page: 1, limit: 10 })).body,
    )
    const second = readBody(
      (await request(app).get('/api/employees').query({ page: 2, limit: 10 })).body,
    )
    const last = readBody(
      (await request(app).get('/api/employees').query({ page: 3, limit: 10 })).body,
    )

    expect(first.meta).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 })
    expect(first.data).toHaveLength(10)
    expect(second.data).toHaveLength(10)
    expect(last.data).toHaveLength(5)
    expect(first.data[0]?.employeeCode).toBe('LST001')
    expect(second.data[0]?.employeeCode).toBe('LST011')
    const secondPageCodes = new Set(second.data.map((employee) => employee.employeeCode))
    expect(first.data.some((employee) => secondPageCodes.has(employee.employeeCode))).toBe(false)
  })

  it('uses the default page and limit', async () => {
    const response = await request(app).get('/api/employees')
    const body = readBody(response.body)

    expect(response.status).toBe(200)
    expect(body.meta.page).toBe(1)
    expect(body.meta.limit).toBe(20)
    expect(body.meta.total).toBe(25)
    expect(body.data).toHaveLength(20)
  })

  it('searches employee code, first name, last name, and email', async () => {
    const byCode = readBody((await request(app).get('/api/employees').query({ search: 'LST007' })).body)
    const byFirstName = readBody(
      (await request(app).get('/api/employees').query({ search: 'Searchable' })).body,
    )
    const byLastName = readBody(
      (await request(app).get('/api/employees').query({ search: 'Needle' })).body,
    )
    const byEmail = readBody(
      (await request(app).get('/api/employees').query({ search: 'find.me@acme.test' })).body,
    )

    expect(byCode.data.map((employee) => employee.employeeCode)).toEqual(['LST007'])
    expect(byFirstName.data.map((employee) => employee.firstName)).toEqual(['Searchable'])
    expect(byLastName.data.map((employee) => employee.lastName)).toEqual(['Needle'])
    expect(byEmail.data.map((employee) => employee.email)).toEqual(['find.me@acme.test'])
  })

  it('filters by department, country, and employment status', async () => {
    const sample = readBody((await request(app).get('/api/employees').query({ limit: 100 })).body)
    const engineering = sample.data.find((employee) => employee.department.name === 'Engineering')
    const india = sample.data.find((employee) => employee.country.isoCode === 'IN')

    if (engineering === undefined || india === undefined) {
      throw new Error('Expected seeded department and country records')
    }

    const byDepartment = readBody(
      (
        await request(app).get('/api/employees').query({
          departmentId: engineering.department.id,
          limit: 100,
        })
      ).body,
    )
    const byCountry = readBody(
      (
        await request(app).get('/api/employees').query({
          countryId: india.country.id,
          limit: 100,
        })
      ).body,
    )
    const byStatus = readBody(
      (
        await request(app)
          .get('/api/employees')
          .query({ employmentStatus: 'TERMINATED', limit: 100 })
      ).body,
    )

    expect(byDepartment.meta.total).toBe(10)
    expect(byDepartment.data.every((employee) => employee.department.name === 'Engineering')).toBe(true)
    expect(byCountry.meta.total).toBe(12)
    expect(byCountry.data.every((employee) => employee.country.isoCode === 'IN')).toBe(true)
    expect(byStatus.data.map((employee) => employee.employeeCode)).toEqual(['LST025'])
    expect(byCountry.data[0]?.currentSalary?.currency.code).toBe('INR')
  })

  it('sorts by an allowlisted field', async () => {
    const response = await request(app).get('/api/employees').query({
      sortBy: 'employeeCode',
      sortOrder: 'desc',
      limit: 5,
    })
    const body = readBody(response.body)

    expect(body.data.map((employee) => employee.employeeCode)).toEqual([
      'LST025',
      'LST024',
      'LST023',
      'LST022',
      'LST021',
    ])
    expect(body.data.find((employee) => employee.employeeCode === 'LST023')?.currentSalary).toBeNull()
  })

  it('rejects invalid query parameters', async () => {
    const response = await request(app).get('/api/employees').query({
      page: 0,
      limit: 500,
      sortBy: 'salary',
      sortOrder: 'sideways',
      employmentStatus: 'UNKNOWN',
      departmentId: 'abc',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Invalid query parameters')
    expect(response.body.error.fields.map((field: { field: string }) => field.field)).toEqual(
      expect.arrayContaining(['page', 'limit', 'sortBy', 'sortOrder', 'employmentStatus', 'departmentId']),
    )
  })
})

describe('GET /api/employees/:id', () => {
  it('returns an employee by database id with salary history', async () => {
    const listed = readBody((await request(app).get('/api/employees').query({ search: 'LST001' })).body)
    const employeeId = listed.data[0]?.employeeCode
    const stored = await prisma.employee.findUnique({ where: { employeeCode: 'LST001' } })

    if (stored === null || employeeId !== 'LST001') {
      throw new Error('Expected seeded employee LST001')
    }

    const response = await request(app).get(`/api/employees/${stored.id}`)
    const body = response.body as {
      data: {
        id: number
        employeeCode: string
        department: { name: string }
        country: { isoCode: string }
        currentSalary: { amount: number; currency: { code: string } } | null
        salaryHistory: { amount: number; currency: { code: string } }[]
        salaryRevisions: { changeReason: string; previousCurrency: { code: string } }[]
      }
    }

    expect(response.status).toBe(200)
    expect(body.data.id).toBe(stored.id)
    expect(body.data.employeeCode).toBe('LST001')
    expect(body.data.department.name).toBe('Engineering')
    expect(body.data.country.isoCode).toBe('IN')
    expect(body.data.currentSalary).toMatchObject({ amount: 5_000_001, currency: { code: 'INR' } })
    expect(body.data.salaryHistory).toHaveLength(2)
    expect(body.data.salaryHistory.every((salary) => salary.currency.code === 'INR')).toBe(true)
    expect(body.data.salaryRevisions[0]?.changeReason).toBe('Annual review')
  })

  it('returns the same employee by employee code', async () => {
    const response = await request(app).get('/api/employees/LST001')

    expect(response.status).toBe(200)
    expect(response.body.data.employeeCode).toBe('LST001')
  })

  it('returns 404 when the employee does not exist', async () => {
    const byId = await request(app).get('/api/employees/999999')
    const byCode = await request(app).get('/api/employees/MISSING1')

    expect(byId.status).toBe(404)
    expect(byId.body.error.message).toBe('Employee not found')
    expect(byCode.status).toBe(404)
    expect(byCode.body.error.message).toBe('Employee not found')
  })

  it('rejects an invalid employee id', async () => {
    const zero = await request(app).get('/api/employees/0')
    const fraction = await request(app).get('/api/employees/1.5')

    expect(zero.status).toBe(400)
    expect(zero.body.error.message).toBe('Invalid employee identifier')
    expect(fraction.status).toBe(400)
    expect(fraction.body.error.fields[0]?.field).toBe('id')
  })
})
