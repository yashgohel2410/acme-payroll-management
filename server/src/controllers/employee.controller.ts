import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError, type FieldError } from '../middleware/error.middleware.js'
import { getEmployee, listEmployees } from '../services/employee.service.js'
import { employeeIdentifierSchema } from '../validators/employeeIdentifier.js'
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

export async function getEmployeeByIdentifier(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const routeId = request.params.id
  const parsed = employeeIdentifierSchema.safeParse(
    typeof routeId === 'string' ? routeId : undefined,
  )

  if (!parsed.success) {
    next(new HttpError(400, 'Invalid employee identifier', fieldErrors(parsed.error)))
    return
  }

  try {
    const employee = await getEmployee(parsed.data)
    if (employee === null) {
      next(new HttpError(404, 'Employee not found'))
      return
    }

    response.status(200).json({ data: employee })
  } catch (error: unknown) {
    next(error)
  }
}
