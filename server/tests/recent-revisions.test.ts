import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-recent-revisions-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'recent-revisions.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5061'

execSync(`npx prisma db push --url "${databaseUrl}"`, {
  cwd: serverRoot,
  env: process.env,
  stdio: 'pipe',
})

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/config/database.js')

const app = createApp()

describe('GET /api/dashboard/recent-revisions', () => {
  it('returns an empty list when no revisions exist', async () => {
    const response = await request(app).get('/api/dashboard/recent-revisions')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })

  it('orders revisions by changedAt descending, including inactive employees', async () => {
    const india = await prisma.country.create({ data: { name: 'India', isoCode: 'IN' } })
    const engineering = await prisma.department.create({ data: { name: 'Engineering' } })
    const inr = await prisma.currency.create({
      data: { code: 'INR', name: 'Indian Rupee', minorUnitDigits: 2 },
    })
    const usd = await prisma.currency.create({
      data: { code: 'USD', name: 'US Dollar', minorUnitDigits: 2 },
    })

    const active = await prisma.employee.create({
      data: {
        employeeCode: 'REV001',
        firstName: 'Ada',
        lastName: 'Active',
        email: 'rev001@acme.test',
        dateOfJoining: new Date(Date.UTC(2020, 0, 1)),
        designation: 'Analyst',
        employmentStatus: 'ACTIVE',
        countryId: india.id,
        departmentId: engineering.id,
      },
    })
    const inactive = await prisma.employee.create({
      data: {
        employeeCode: 'REV002',
        firstName: 'Ian',
        lastName: 'Inactive',
        email: 'rev002@acme.test',
        dateOfJoining: new Date(Date.UTC(2020, 0, 1)),
        designation: 'Analyst',
        employmentStatus: 'INACTIVE',
        countryId: india.id,
        departmentId: engineering.id,
      },
    })

    const activeSalary = await prisma.salary.create({
      data: {
        employeeId: active.id,
        amount: 2_000_000,
        currencyId: inr.id,
        effectiveFrom: new Date(Date.UTC(2024, 0, 1)),
        effectiveTo: null,
      },
    })
    const inactiveSalary = await prisma.salary.create({
      data: {
        employeeId: inactive.id,
        amount: 4_000_000,
        currencyId: usd.id,
        effectiveFrom: new Date(Date.UTC(2024, 0, 1)),
        effectiveTo: null,
      },
    })

    const base = Date.UTC(2024, 0, 1)
    for (let index = 0; index < 11; index += 1) {
      await prisma.salaryRevision.create({
        data: {
          employeeId: active.id,
          salaryId: activeSalary.id,
          previousAmount: 1_000_000 + index,
          updatedAmount: 2_000_000 + index,
          previousCurrencyId: inr.id,
          updatedCurrencyId: inr.id,
          changeReason: `Review ${index}`,
          changedAt: new Date(base + index * 60_000),
        },
      })
    }

    await prisma.salaryRevision.create({
      data: {
        employeeId: inactive.id,
        salaryId: inactiveSalary.id,
        previousAmount: 3_000_000,
        updatedAmount: 4_000_000,
        previousCurrencyId: inr.id,
        updatedCurrencyId: usd.id,
        changeReason: 'Inactive review',
        changedAt: new Date(base + 12 * 60_000),
      },
    })

    const response = await request(app).get('/api/dashboard/recent-revisions').query({ limit: 12 })

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(12)
    expect(response.body.data[0]).toMatchObject({
      previousAmount: 3_000_000,
      updatedAmount: 4_000_000,
      changeReason: 'Inactive review',
      changedAt: new Date(base + 12 * 60_000).toISOString(),
      previousCurrency: { code: 'INR' },
      updatedCurrency: { code: 'USD' },
      employee: {
        employeeCode: 'REV002',
        firstName: 'Ian',
        lastName: 'Inactive',
      },
    })
    expect(response.body.data.map((revision: { updatedAmount: number }) => revision.updatedAmount)).toEqual([
      4_000_000, 2_000_010, 2_000_009, 2_000_008, 2_000_007, 2_000_006, 2_000_005, 2_000_004, 2_000_003,
      2_000_002, 2_000_001, 2_000_000,
    ])
  })

  it('uses the default limit of 10', async () => {
    const response = await request(app).get('/api/dashboard/recent-revisions')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(10)
    expect(response.body.data[0].employee.employeeCode).toBe('REV002')
    expect(response.body.data[9].updatedAmount).toBe(2_000_002)
  })

  it('accepts the maximum limit and rejects a larger limit', async () => {
    const accepted = await request(app).get('/api/dashboard/recent-revisions').query({ limit: 50 })
    const rejected = await request(app).get('/api/dashboard/recent-revisions').query({ limit: 51 })

    expect(accepted.status).toBe(200)
    expect(accepted.body.data).toHaveLength(12)
    expect(rejected.status).toBe(400)
    expect(rejected.body.error.message).toBe('Invalid query parameters')
    expect(rejected.body.error.fields.map((field: { field: string }) => field.field)).toContain('limit')
  })
})
