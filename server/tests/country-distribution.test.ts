import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-countries-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'countries.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5059'

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
  const unitedStates = await prisma.country.create({
    data: { name: 'United States', isoCode: 'US' },
  })
  await prisma.country.create({ data: { name: 'Germany', isoCode: 'DE' } })
  const unitedArabEmirates = await prisma.country.create({
    data: { name: 'United Arab Emirates', isoCode: 'AE' },
  })
  const engineering = await prisma.department.create({ data: { name: 'Engineering' } })

  const employees = [
    { employeeCode: 'CTY001', countryId: india.id, employmentStatus: 'ACTIVE' as const },
    { employeeCode: 'CTY002', countryId: india.id, employmentStatus: 'ACTIVE' as const },
    { employeeCode: 'CTY003', countryId: india.id, employmentStatus: 'INACTIVE' as const },
    { employeeCode: 'CTY004', countryId: unitedStates.id, employmentStatus: 'ACTIVE' as const },
    { employeeCode: 'CTY005', countryId: unitedArabEmirates.id, employmentStatus: 'TERMINATED' as const },
    { employeeCode: 'CTY006', countryId: unitedArabEmirates.id, employmentStatus: 'ON_LEAVE' as const },
  ]

  for (const employee of employees) {
    await prisma.employee.create({
      data: {
        employeeCode: employee.employeeCode,
        firstName: 'Country',
        lastName: employee.employeeCode,
        email: `${employee.employeeCode.toLowerCase()}@acme.test`,
        dateOfJoining: new Date(Date.UTC(2020, 0, 1)),
        designation: 'Analyst',
        employmentStatus: employee.employmentStatus,
        countryId: employee.countryId,
        departmentId: engineering.id,
      },
    })
  }
})

describe('GET /api/dashboard/country-distribution', () => {
  it('counts active employees for multiple countries and sorts by that count', async () => {
    const response = await request(app).get('/api/dashboard/country-distribution')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { name: 'India', isoCode: 'IN', employeeCount: 2 },
      { name: 'United States', isoCode: 'US', employeeCount: 1 },
      { name: 'Germany', isoCode: 'DE', employeeCount: 0 },
      { name: 'United Arab Emirates', isoCode: 'AE', employeeCount: 0 },
    ])
  })

  it('includes countries with zero active employees', async () => {
    const response = await request(app).get('/api/dashboard/country-distribution')
    const emptyCountries = response.body.data.filter(
      (country: { employeeCount: number }) => country.employeeCount === 0,
    )

    expect(response.status).toBe(200)
    expect(emptyCountries).toEqual([
      { name: 'Germany', isoCode: 'DE', employeeCount: 0 },
      { name: 'United Arab Emirates', isoCode: 'AE', employeeCount: 0 },
    ])
  })
})
