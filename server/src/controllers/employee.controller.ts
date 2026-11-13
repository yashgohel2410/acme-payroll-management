import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError, type FieldError } from '../middleware/error.middleware.js'
import {
  EmployeeAlreadyInactiveError,
  EmployeeDuplicateError,
  EmployeeNotFoundError,
  EmployeeReferenceNotFoundError,
} from '../repositories/employee.repository.js'
import {
  createEmployee,
  deactivateEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
} from '../services/employee.service.js'
import { createEmployeeSchema } from '../validators/createEmployee.js'
import { updateEmployeeSchema } from '../validators/updateEmployee.js'
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

export async function postEmployee(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const parsed = createEmployeeSchema.safeParse(request.body)

  if (!parsed.success) {
    next(new HttpError(400, 'Invalid request body', fieldErrors(parsed.error)))
    return
  }

  try {
    const employee = await createEmployee(parsed.data)
    response.status(201).json({ data: employee })
  } catch (error: unknown) {
    if (error instanceof EmployeeReferenceNotFoundError) {
      next(
        new HttpError(
          404,
          error.message,
          error.fields.map((field) => ({ field, message: 'Record not found' })),
        ),
      )
      return
    }

    if (error instanceof EmployeeDuplicateError) {
      next(
        new HttpError(
          409,
          error.message,
          error.fields.map((field) => ({ field, message: 'Already exists' })),
        ),
      )
      return
    }

    next(error)
  }
}

export async function putEmployee(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const routeId = request.params.id
  const identifier = employeeIdentifierSchema.safeParse(
    typeof routeId === 'string' ? routeId : undefined,
  )

  if (!identifier.success) {
    next(new HttpError(400, 'Invalid employee identifier', fieldErrors(identifier.error)))
    return
  }

  const parsed = updateEmployeeSchema.safeParse(request.body)

  if (!parsed.success) {
    next(new HttpError(400, 'Invalid request body', fieldErrors(parsed.error)))
    return
  }

  try {
    const employee = await updateEmployee(identifier.data, parsed.data)
    response.status(200).json({ data: employee })
  } catch (error: unknown) {
    if (error instanceof EmployeeNotFoundError) {
      next(new HttpError(404, error.message))
      return
    }

    if (error instanceof EmployeeReferenceNotFoundError) {
      next(
        new HttpError(
          404,
          error.message,
          error.fields.map((field) => ({ field, message: 'Record not found' })),
        ),
      )
      return
    }

    if (error instanceof EmployeeDuplicateError) {
      next(
        new HttpError(
          409,
          error.message,
          error.fields.map((field) => ({ field, message: 'Already exists' })),
        ),
      )
      return
    }

    next(error)
  }
}

export async function deleteEmployee(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const routeId = request.params.id
  const identifier = employeeIdentifierSchema.safeParse(
    typeof routeId === 'string' ? routeId : undefined,
  )

  if (!identifier.success) {
    next(new HttpError(400, 'Invalid employee identifier', fieldErrors(identifier.error)))
    return
  }

  try {
    const employee = await deactivateEmployee(identifier.data)
    response.status(200).json({ data: employee })
  } catch (error: unknown) {
    if (error instanceof EmployeeNotFoundError) {
      next(new HttpError(404, error.message))
      return
    }

    if (error instanceof EmployeeAlreadyInactiveError) {
      next(
        new HttpError(409, error.message, [
          { field: 'employmentStatus', message: 'Already inactive' },
        ]),
      )
      return
    }

    next(error)
  }
}
