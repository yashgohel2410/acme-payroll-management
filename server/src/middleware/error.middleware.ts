import type { NextFunction, Request, Response } from 'express'

export type FieldError = {
  field: string
  message: string
}

type ErrorBody = {
  error: {
    message: string
    fields?: readonly FieldError[]
  }
}

export class HttpError extends Error {
  readonly statusCode: number
  readonly fields: readonly FieldError[] | undefined

  constructor(statusCode: number, message: string, fields?: readonly FieldError[]) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.fields = fields
  }
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    const body: ErrorBody =
      error.fields === undefined || error.fields.length === 0
        ? { error: { message: error.message } }
        : { error: { message: error.message, fields: error.fields } }
    response.status(error.statusCode).json(body)
    return
  }

  console.error(error)
  const body: ErrorBody = { error: { message: 'Internal server error' } }
  response.status(500).json(body)
}
