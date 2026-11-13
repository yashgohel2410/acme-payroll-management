import type { Express } from 'express'
import { employeeRouter } from './employee.routes.js'
import { healthRouter } from './health.routes.js'
import { salaryRouter } from './salary.routes.js'

export function registerRoutes(app: Express): void {
  app.use('/api/employees', employeeRouter)
  app.use('/api/salaries', salaryRouter)
  app.use('/api', healthRouter)
}
