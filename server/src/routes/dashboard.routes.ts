import { Router } from 'express'
import {
  getCountryDistribution,
  getDashboardSummary,
  getDepartmentDistribution,
  getRecentRevisions,
  getSalaryDistribution,
} from '../controllers/dashboard.controller.js'

export const dashboardRouter = Router()

dashboardRouter.get('/summary', getDashboardSummary)
dashboardRouter.get('/department-distribution', getDepartmentDistribution)
dashboardRouter.get('/country-distribution', getCountryDistribution)
dashboardRouter.get('/salary-distribution', getSalaryDistribution)
dashboardRouter.get('/recent-revisions', getRecentRevisions)
