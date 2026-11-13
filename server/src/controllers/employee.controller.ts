import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError, type FieldError } from '../middleware/error.middleware.js'
import { listEmployees } from '../services/employee.service.js'
import { employeeListQuerySchema } from '../validators/employeeListQuery.js'

function fieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'query',
    message: issue.message,
  }))
}

export async function getEmployees(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = employeeListQuerySchema.safeParse(request.query)

  if (!parsed.success) {
    next(new HttpError(400, 'Invalid query parameters', fieldErrors(parsed.error)))
    return
  }

  try {
    const body = await listEmployees(parsed.data)
    response.status(200).json(body)
  } catch (error: unknown) {
    next(error)
  }
}
