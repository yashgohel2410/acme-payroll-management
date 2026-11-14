import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError, type FieldError } from '../middleware/error.middleware.js'
import {
  listCountryDistribution,
  listDepartmentDistribution,
  listRecentRevisions,
  listSalaryDistribution,
  summarizeDashboard,
} from '../services/dashboard.service.js'
import { recentRevisionsQuerySchema } from '../validators/recentRevisionsQuery.js'

function fieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'query',
    message: issue.message,
  }))
}

export async function getDashboardSummary(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await summarizeDashboard()
    response.status(200).json({ data: summary })
  } catch (error: unknown) {
    next(error)
  }
}

export async function getDepartmentDistribution(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const departments = await listDepartmentDistribution()
    response.status(200).json({ data: departments })
  } catch (error: unknown) {
    next(error)
  }
}

export async function getCountryDistribution(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const countries = await listCountryDistribution()
    response.status(200).json({ data: countries })
  } catch (error: unknown) {
    next(error)
  }
}

export async function getSalaryDistribution(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const salaries = await listSalaryDistribution()
    response.status(200).json({ data: salaries })
  } catch (error: unknown) {
    next(error)
  }
}

export async function getRecentRevisions(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = recentRevisionsQuerySchema.safeParse(request.query)

  if (!parsed.success) {
    next(new HttpError(400, 'Invalid query parameters', fieldErrors(parsed.error)))
    return
  }

  try {
    const revisions = await listRecentRevisions(parsed.data.limit)
    response.status(200).json({ data: revisions })
  } catch (error: unknown) {
    next(error)
  }
}
