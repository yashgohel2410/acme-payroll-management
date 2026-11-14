import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-salary-distribution-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'salary-distribution.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5060'

execSync(`npx prisma db push --url "${databaseUrl}"`, {
  cwd: serverRoot,
  env: process.env,
  stdio: 'pipe',
})

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/config/database.js')

const app = createApp()

beforeAll(async () => {
  const india = await prisma.country.create({ data: { name: 'India', isoCode: 'IN' } })
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } })
  const inr = await prisma.currency.create({
    data: { code: 'INR', name: 'Indian Rupee', minorUnitDigits: 2 },
  })
  const usd = await prisma.currency.create({
    data: { code: 'USD', name: 'US Dollar', minorUnitDigits: 2 },
  })

  const people = [
    {
      employeeCode: 'SALD01',
      employmentStatus: 'ACTIVE' as const,
      salaries: [
        {
          amount: 1_000_000,
          currencyId: inr.id,
          effectiveFrom: new Date(Date.UTC(2019, 0, 1)),
          effectiveTo: new Date(Date.UTC(2019, 11, 31)),
        },
        {
          amount: 5_000_000,
          currencyId: inr.id,
          effectiveFrom: new Date(Date.UTC(2020, 0, 1)),
          effectiveTo: null,
        },
        {
          amount: 50_000_000,
          currencyId: inr.id,
          effectiveFrom: new Date(Date.UTC(2099, 0, 1)),
          effectiveTo: null,
        },
      ],
    },
    {
      employeeCode: 'SALD02',
      employmentStatus: 'ACTIVE' as const,
      salaries: [
        {
          amount: 3_000_000,
          currencyId: inr.id,
          effectiveFrom: new Date(Date.UTC(2021, 0, 1)),
          effectiveTo: null,
        },
      ],
    },
    {
      employeeCode: 'SALD03',
      employmentStatus: 'ACTIVE' as const,
      salaries: [
        {
          amount: 500_000,
          currencyId: usd.id,
          effectiveFrom: new Date(Date.UTC(2018, 0, 1)),
          effectiveTo: new Date(Date.UTC(2020, 11, 31)),
        },
        {
          amount: 2_000_000,
          currencyId: usd.id,
          effectiveFrom: new Date(Date.UTC(2021, 0, 1)),
          effectiveTo: null,
        },
      ],
    },
    {
      employeeCode: 'SALD04',
      employmentStatus: 'INACTIVE' as const,
      salaries: [
        {
          amount: 9_000_000,
          currencyId: inr.id,
          effectiveFrom: new Date(Date.UTC(2020, 0, 1)),
          effectiveTo: null,
        },
      ],
    },
  ]

  for (const person of people) {
    const employee = await prisma.employee.create({
      data: {
        employeeCode: person.employeeCode,
        firstName: 'Salary',
        lastName: person.employeeCode,
        email: `${person.employeeCode.toLowerCase()}@acme.test`,
        dateOfJoining: new Date(Date.UTC(2018, 0, 1)),
        designation: 'Analyst',
        employmentStatus: person.employmentStatus,
        countryId: india.id,
        departmentId: engineering.id,
      },
    })

    for (const salary of person.salaries) {
      await prisma.salary.create({
        data: {
          employeeId: employee.id,
          amount: salary.amount,
          currencyId: salary.currencyId,
          effectiveFrom: salary.effectiveFrom,
          effectiveTo: salary.effectiveTo,
        },
      })
    }
  }
})

describe('GET /api/dashboard/salary-distribution', () => {
  it('returns a separate total for each currency', async () => {
    const response = await request(app).get('/api/dashboard/salary-distribution')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { code: 'INR', employeeCount: 2, totalAmount: 8_000_000 },
      { code: 'USD', employeeCount: 1, totalAmount: 2_000_000 },
    ])
  })

  it('excludes inactive employees from the currency totals', async () => {
    const response = await request(app).get('/api/dashboard/salary-distribution')
    const inr = response.body.data.find((row: { code: string }) => row.code === 'INR')

    expect(inr).toEqual({ code: 'INR', employeeCount: 2, totalAmount: 8_000_000 })
  })

  it('uses the current salary and ignores historical and future amounts', async () => {
    const response = await request(app).get('/api/dashboard/salary-distribution')

    expect(response.body.data).toEqual([
      { code: 'INR', employeeCount: 2, totalAmount: 8_000_000 },
      { code: 'USD', employeeCount: 1, totalAmount: 2_000_000 },
    ])
  })
})
