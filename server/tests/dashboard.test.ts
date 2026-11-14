import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-dashboard-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'dashboard.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5057'

execSync(`npx prisma db push --url "${databaseUrl}"`, {
  cwd: serverRoot,
  env: process.env,
  stdio: 'pipe',
})

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/config/database.js')

const app = createApp()

const dayMs = 24 * 60 * 60 * 1000

describe('GET /api/dashboard/summary', () => {
  it('returns zero counts for an empty database', async () => {
    const response = await request(app).get('/api/dashboard/summary')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      totalDepartments: 0,
      totalCountries: 0,
      salaryRevisionsLast30Days: 0,
    })
  })

  it('returns employee, department, country, and recent revision counts', async () => {
    const india = await prisma.country.create({ data: { name: 'India', isoCode: 'IN' } })
    const unitedStates = await prisma.country.create({
      data: { name: 'United States', isoCode: 'US' },
    })
    const engineering = await prisma.department.create({ data: { name: 'Engineering' } })
    const finance = await prisma.department.create({ data: { name: 'Finance' } })
    const inr = await prisma.currency.create({
      data: { code: 'INR', name: 'Indian Rupee', minorUnitDigits: 2 },
    })

    const employees = [
      { employeeCode: 'DASH01', status: 'ACTIVE' as const, departmentId: engineering.id, countryId: india.id },
      { employeeCode: 'DASH02', status: 'ACTIVE' as const, departmentId: finance.id, countryId: unitedStates.id },
      { employeeCode: 'DASH03', status: 'INACTIVE' as const, departmentId: engineering.id, countryId: india.id },
      { employeeCode: 'DASH04', status: 'ON_LEAVE' as const, departmentId: finance.id, countryId: unitedStates.id },
      { employeeCode: 'DASH05', status: 'TERMINATED' as const, departmentId: engineering.id, countryId: india.id },
    ]

    const now = Date.now()
    const revisionAges = [0, 29, 31]

    for (const [index, employee] of employees.entries()) {
      const created = await prisma.employee.create({
        data: {
          employeeCode: employee.employeeCode,
          firstName: 'Dash',
          lastName: employee.employeeCode,
          email: `${employee.employeeCode.toLowerCase()}@acme.test`,
          dateOfJoining: new Date(Date.UTC(2020, 0, 1)),
          designation: 'Analyst',
          employmentStatus: employee.status,
          countryId: employee.countryId,
          departmentId: employee.departmentId,
        },
      })

      const salary = await prisma.salary.create({
        data: {
          employeeId: created.id,
          amount: 1_000_000 + index,
          currencyId: inr.id,
          effectiveFrom: new Date(Date.UTC(2020, 0, 1)),
          effectiveTo: null,
        },
      })

      const age = revisionAges[index]
      if (age !== undefined) {
        await prisma.salaryRevision.create({
          data: {
            employeeId: created.id,
            salaryId: salary.id,
            previousAmount: 900_000,
            updatedAmount: salary.amount,
            previousCurrencyId: inr.id,
            updatedCurrencyId: inr.id,
            changeReason: 'Review',
            changedAt: new Date(now - age * dayMs),
          },
        })
      }
    }

    const response = await request(app).get('/api/dashboard/summary')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      totalEmployees: 5,
      activeEmployees: 2,
      inactiveEmployees: 1,
      totalDepartments: 2,
      totalCountries: 2,
      salaryRevisionsLast30Days: 2,
    })
  })
})
