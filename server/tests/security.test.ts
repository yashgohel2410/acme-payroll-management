import { execSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const databaseDirectory = mkdtempSync(path.join(tmpdir(), 'acme-security-'))
const databaseUrl = `file:${path.join(databaseDirectory, 'security.db').split('\\').join('/')}`

process.env.DATABASE_URL = databaseUrl
process.env.NODE_ENV = 'test'
process.env.PORT = '5071'
process.env.CORS_ORIGIN = 'http://localhost:5173'

execSync(`npx prisma db push --url "${databaseUrl}"`, {
  cwd: serverRoot,
  env: process.env,
  stdio: 'pipe',
})

const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/config/database.js')
const { errorHandler } = await import('../src/middleware/error.middleware.js')

const app = createApp()

beforeAll(async () => {
  const country = await prisma.country.create({ data: { name: 'India', isoCode: 'IN' } })
  const department = await prisma.department.create({ data: { name: 'Engineering' } })
  const currency = await prisma.currency.create({
    data: { code: 'INR', name: 'Indian Rupee', minorUnitDigits: 2 },
  })

  await request(app).post('/api/employees').send({
    employeeCode: 'SEC001',
    firstName: 'Asha',
    lastName: 'Menon',
    email: 'asha.security@acme.test',
    phone: '12345',
    designation: 'Analyst',
    dateOfJoining: '2026-12-01',
    employmentStatus: 'ACTIVE',
    departmentId: department.id,
    countryId: country.id,
    amount: 100_000,
    currencyId: currency.id,
    effectiveFrom: '2026-12-01',
  })
})

describe('request protection', () => {
  it('rejects malformed JSON without exposing a stack trace', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set('Content-Type', 'application/json')
      .send('{"employeeCode":')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: { message: 'Invalid JSON body' } })
    expect(JSON.stringify(response.body)).not.toContain('stack')
  })

  it('rejects a request body above the limit', async () => {
    const response = await request(app)
      .post('/api/employees')
      .send({ note: 'x'.repeat(40_000) })

    expect(response.status).toBe(413)
    expect(response.body).toEqual({ error: { message: 'Request body is too large' } })
  })

  it('allows the configured browser origin and hides the server header', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173')
    const blocked = await request(app).get('/api/health').set('Origin', 'http://evil.example')

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()
    expect(allowed.headers['x-powered-by']).toBeUndefined()
  })

  it('does not persist a duplicate employee or salary when creation is rejected', async () => {
    const employeesBefore = await prisma.employee.count()
    const salariesBefore = await prisma.salary.count()
    const response = await request(app).post('/api/employees').send({
      employeeCode: 'SEC002',
      firstName: 'Asha',
      lastName: 'Menon',
      email: 'asha.security@acme.test',
      phone: '12345',
      designation: 'Analyst',
      dateOfJoining: '2026-12-01',
      employmentStatus: 'ACTIVE',
      departmentId: 1,
      countryId: 1,
      amount: 100_000,
      currencyId: 1,
      effectiveFrom: '2026-12-01',
    })

    expect(response.status).toBe(409)
    expect(response.body.stack).toBeUndefined()
    expect(await prisma.employee.count()).toBe(employeesBefore)
    expect(await prisma.salary.count()).toBe(salariesBefore)
  })
})

describe('database error responses', () => {
  it('hides Prisma details from the client', () => {
    const databaseError = new Error('Unique constraint failed on the fields: (`email`)')
    databaseError.name = 'PrismaClientKnownRequestError'
    const status = { code: 0, body: undefined as unknown }
    const response = {
      status(code: number) {
        status.code = code
        return this
      },
      json(body: unknown) {
        status.body = body
      },
    }

    errorHandler(databaseError, {} as never, response as never, (() => undefined) as never)

    expect(status.code).toBe(500)
    expect(status.body).toEqual({ error: { message: 'Internal server error' } })
  })
})
