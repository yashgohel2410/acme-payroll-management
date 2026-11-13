import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-salaries-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'salaries.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5056'

execSync(`npx prisma db push --url "${databaseUrl}"`, {
  cwd: serverRoot,
  env: process.env,
  stdio: 'pipe',
})

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/config/database.js')

const app = createApp()

type SalaryResponse = {
  data: {
    amount: number
    effectiveFrom: string
    effectiveTo: string | null
    currency: { code: string }
    employee: {
      employeeCode: string
      firstName: string
      lastName: string
      email: string
      department: { id: number; name: string }
      country: { id: number; isoCode: string }
    }
  }[]
  meta: {
    page: number
    limit: number
    totalRecords: number
    totalPages: number
  }
}

function readBody(value: unknown): SalaryResponse {
  if (typeof value !== 'object' || value === null || !('data' in value) || !('meta' in value)) {
    throw new Error('Expected a salary list response')
  }

  return value as SalaryResponse
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

  const employees = [
    {
      employeeCode: 'SAL004',
      firstName: 'Fourth',
      lastName: 'Person',
      email: 'sal004@acme.test',
      countryId: unitedStates.id,
      departmentId: finance.id,
      currencyId: usd.id,
      salaries: [{ amount: 1_500, effectiveFrom: '2019-01-01', effectiveTo: null }],
    },
    {
      employeeCode: 'SAL001',
      firstName: 'Searchable',
      lastName: 'Alpha',
      email: 'find.salary@acme.test',
      countryId: india.id,
      departmentId: engineering.id,
      currencyId: inr.id,
      salaries: [
        { amount: 1_000, effectiveFrom: '2020-01-01', effectiveTo: '2021-12-31' },
        { amount: 3_000, effectiveFrom: '2022-01-01', effectiveTo: null },
      ],
    },
    {
      employeeCode: 'SAL002',
      firstName: 'Second',
      lastName: 'Needle',
      email: 'needle.salary@acme.test',
      countryId: unitedStates.id,
      departmentId: finance.id,
      currencyId: usd.id,
      salaries: [{ amount: 2_000, effectiveFrom: '2021-06-01', effectiveTo: '2023-01-01' }],
    },
    {
      employeeCode: 'SAL003',
      firstName: 'Third',
      lastName: 'Person',
      email: 'sal003@acme.test',
      countryId: india.id,
      departmentId: engineering.id,
      currencyId: inr.id,
      salaries: [{ amount: 4_000, effectiveFrom: '2024-01-01', effectiveTo: null }],
    },
    {
      employeeCode: 'SAL005',
      firstName: 'Fifth',
      lastName: 'Person',
      email: 'sal005@acme.test',
      countryId: india.id,
      departmentId: engineering.id,
      currencyId: inr.id,
      salaries: [{ amount: 2_500, effectiveFrom: '2023-05-01', effectiveTo: null }],
    },
  ]

  for (const employee of employees) {
    const created = await prisma.employee.create({
      data: {
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: '+15550001111',
        dateOfJoining: new Date(Date.UTC(2019, 0, 1)),
        designation: 'Analyst',
        employmentStatus: 'ACTIVE',
        countryId: employee.countryId,
        departmentId: employee.departmentId,
      },
    })

    for (const salary of employee.salaries) {
      await prisma.salary.create({
        data: {
          employeeId: created.id,
          amount: salary.amount,
          currencyId: employee.currencyId,
          effectiveFrom: new Date(`${salary.effectiveFrom}T00:00:00.000Z`),
          effectiveTo:
            salary.effectiveTo === null ? null : new Date(`${salary.effectiveTo}T00:00:00.000Z`),
        },
      })
    }
  }
})

describe('GET /api/salaries', () => {
  it('paginates salary records', async () => {
    const first = readBody(
      (await request(app).get('/api/salaries').query({ page: 1, limit: 2, sortBy: 'effectiveFrom' })).body,
    )
    const second = readBody(
      (await request(app).get('/api/salaries').query({ page: 2, limit: 2, sortBy: 'effectiveFrom' })).body,
    )
    const last = readBody(
      (await request(app).get('/api/salaries').query({ page: 3, limit: 2, sortBy: 'effectiveFrom' })).body,
    )

    expect(first.meta).toEqual({ page: 1, limit: 2, totalRecords: 6, totalPages: 3 })
    expect(first.data.map((salary) => salary.amount)).toEqual([1_500, 1_000])
    expect(second.data.map((salary) => salary.amount)).toEqual([2_000, 3_000])
    expect(last.data).toHaveLength(2)
    expect(last.data.map((salary) => salary.amount)).toEqual([2_500, 4_000])
    expect(first.data[0]?.employee.department.name).toBe('Finance')
    expect(first.data[0]?.employee.country.isoCode).toBe('US')
    expect(first.data[0]?.currency.code).toBe('USD')
  })

  it('uses the default page and limit', async () => {
    const response = await request(app).get('/api/salaries')
    const body = readBody(response.body)

    expect(response.status).toBe(200)
    expect(body.meta.page).toBe(1)
    expect(body.meta.limit).toBe(20)
    expect(body.meta.totalRecords).toBe(6)
    expect(body.data).toHaveLength(6)
  })

  it('searches employee code, first name, last name, and email', async () => {
    const byCode = readBody((await request(app).get('/api/salaries').query({ search: 'SAL001' })).body)
    const byFirstName = readBody(
      (await request(app).get('/api/salaries').query({ search: 'Searchable' })).body,
    )
    const byLastName = readBody((await request(app).get('/api/salaries').query({ search: 'Needle' })).body)
    const byEmail = readBody(
      (await request(app).get('/api/salaries').query({ search: 'find.salary@acme.test' })).body,
    )

    expect(byCode.data.map((salary) => salary.employee.employeeCode)).toEqual(['SAL001', 'SAL001'])
    expect(byFirstName.data.map((salary) => salary.employee.firstName)).toEqual(['Searchable', 'Searchable'])
    expect(byLastName.data.map((salary) => salary.employee.lastName)).toEqual(['Needle'])
    expect(byEmail.data.map((salary) => salary.employee.email)).toEqual([
      'find.salary@acme.test',
      'find.salary@acme.test',
    ])
  })

  it('filters by department, country, currency, and effective date', async () => {
    const engineering = await prisma.department.findUniqueOrThrow({ where: { name: 'Engineering' } })
    const unitedStates = await prisma.country.findUniqueOrThrow({ where: { isoCode: 'US' } })
    const usd = await prisma.currency.findUniqueOrThrow({ where: { code: 'USD' } })

    const byDepartment = readBody(
      (await request(app).get('/api/salaries').query({ departmentId: engineering.id, limit: 100 })).body,
    )
    const byCountry = readBody(
      (await request(app).get('/api/salaries').query({ countryId: unitedStates.id, limit: 100 })).body,
    )
    const byCurrency = readBody(
      (await request(app).get('/api/salaries').query({ currencyId: usd.id, limit: 100 })).body,
    )
    const byEffectiveDate = readBody(
      (await request(app).get('/api/salaries').query({ effectiveDate: '2022-06-01', limit: 100 })).body,
    )

    expect(byDepartment.meta.totalRecords).toBe(4)
    expect(byDepartment.data.every((salary) => salary.employee.department.name === 'Engineering')).toBe(true)
    expect(byCountry.meta.totalRecords).toBe(2)
    expect(byCountry.data.every((salary) => salary.employee.country.isoCode === 'US')).toBe(true)
    expect(byCurrency.data.map((salary) => salary.currency.code)).toEqual(['USD', 'USD'])
    expect(byEffectiveDate.data.map((salary) => salary.amount).sort((left, right) => left - right)).toEqual([
      1_500, 2_000, 3_000,
    ])
  })

  it('sorts by amount and effective dates', async () => {
    const byAmount = readBody(
      (await request(app).get('/api/salaries').query({ sortBy: 'amount', sortOrder: 'desc' })).body,
    )
    const byEffectiveTo = readBody(
      (await request(app).get('/api/salaries').query({ sortBy: 'effectiveTo', sortOrder: 'asc' })).body,
    )

    expect(byAmount.data.map((salary) => salary.amount)).toEqual([4_000, 3_000, 2_500, 2_000, 1_500, 1_000])
    expect(byEffectiveTo.data.map((salary) => salary.amount)).toEqual([1_500, 3_000, 4_000, 2_500, 1_000, 2_000])
    expect(byEffectiveTo.data[4]?.effectiveTo).toBe('2021-12-31T00:00:00.000Z')
    expect(byEffectiveTo.data[5]?.effectiveTo).toBe('2023-01-01T00:00:00.000Z')
  })

  it('rejects invalid query parameters', async () => {
    const response = await request(app).get('/api/salaries').query({
      page: 0,
      limit: 500,
      sortBy: 'employeeCode',
      sortOrder: 'sideways',
      departmentId: 'abc',
      currencyId: -1,
      effectiveDate: '15-01-2024',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Invalid query parameters')
    expect(response.body.error.fields.map((field: { field: string }) => field.field)).toEqual(
      expect.arrayContaining([
        'page',
        'limit',
        'sortBy',
        'sortOrder',
        'departmentId',
        'currencyId',
        'effectiveDate',
      ]),
    )
  })
})
