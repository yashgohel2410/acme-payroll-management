import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

describe('GET /api/health', () => {
  it('returns a successful health response', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/application\/json/)
  })

  it('returns the health response structure', async () => {
    const response = await request(app).get('/api/health')

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'acme-payroll-management',
    })
    expect(response.body.timestamp).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false)
  })
})
