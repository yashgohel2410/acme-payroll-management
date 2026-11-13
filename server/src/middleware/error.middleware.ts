import type { NextFunction, Request, Response } from 'express'

type ErrorBody = {
  error: {
    message: string
  }
}

export class HttpError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    const body: ErrorBody = { error: { message: error.message } }
    response.status(error.statusCode).json(body)
    return
  }

  console.error(error)
  const body: ErrorBody = { error: { message: 'Internal server error' } }
  response.status(500).json(body)
}
