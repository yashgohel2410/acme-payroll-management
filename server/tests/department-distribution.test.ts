import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-departments-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'departments.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5058'

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
  const finance = await prisma.department.create({ data: { name: 'Finance' } })
  await prisma.department.create({ data: { name: 'Legal' } })
  const sales = await prisma.department.create({ data: { name: 'Sales' } })

  const employees = [
    { employeeCode: 'DEP001', departmentId: engineering.id, employmentStatus: 'ACTIVE' as const },
    { employeeCode: 'DEP002', departmentId: engineering.id, employmentStatus: 'ACTIVE' as const },
    { employeeCode: 'DEP003', departmentId: engineering.id, employmentStatus: 'INACTIVE' as const },
    { employeeCode: 'DEP004', departmentId: finance.id, employmentStatus: 'ACTIVE' as const },
    { employeeCode: 'DEP005', departmentId: sales.id, employmentStatus: 'TERMINATED' as const },
    { employeeCode: 'DEP006', departmentId: sales.id, employmentStatus: 'ON_LEAVE' as const },
  ]

  for (const employee of employees) {
    await prisma.employee.create({
      data: {
        employeeCode: employee.employeeCode,
        firstName: 'Dept',
        lastName: employee.employeeCode,
        email: `${employee.employeeCode.toLowerCase()}@acme.test`,
        dateOfJoining: new Date(Date.UTC(2020, 0, 1)),
        designation: 'Analyst',
        employmentStatus: employee.employmentStatus,
        countryId: india.id,
        departmentId: employee.departmentId,
      },
    })
  }
})

describe('GET /api/dashboard/department-distribution', () => {
  it('counts active employees and sorts departments by that count', async () => {
    const response = await request(app).get('/api/dashboard/department-distribution')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { name: 'Engineering', employeeCount: 2 },
      { name: 'Finance', employeeCount: 1 },
      { name: 'Legal', employeeCount: 0 },
      { name: 'Sales', employeeCount: 0 },
    ])
  })

  it('includes departments with zero active employees', async () => {
    const response = await request(app).get('/api/dashboard/department-distribution')
    const emptyDepartments = response.body.data.filter(
      (department: { employeeCount: number }) => department.employeeCount === 0,
    )

    expect(response.status).toBe(200)
    expect(emptyDepartments).toEqual([
      { name: 'Legal', employeeCount: 0 },
      { name: 'Sales', employeeCount: 0 },
    ])
  })
})
