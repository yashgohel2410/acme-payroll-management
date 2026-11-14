import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDatabaseError(error: unknown): boolean {
  return isRecord(error) && typeof error.name === 'string' && error.name.startsWith('PrismaClient')
}

function isInvalidJson(error: unknown): boolean {
  if (!(error instanceof SyntaxError) || !isRecord(error)) {
    return false
  }

  return error.type === 'entity.parse.failed' || error.status === 400 || error.statusCode === 400
}

function isBodyTooLarge(error: unknown): boolean {
  if (!isRecord(error)) {
    return false
  }

  return error.type === 'entity.too.large' || error.status === 413 || error.statusCode === 413
}

function logServerError(error: unknown): void {
  if (env.NODE_ENV === 'production') {
    const name = error instanceof Error ? error.name : 'UnknownError'
    console.error(name)
    return
  }

  console.error(error)
}

function sendError(response: Response, statusCode: number, message: string, fields?: readonly FieldError[]): void {
  const body: ErrorBody =
    fields === undefined || fields.length === 0
      ? { error: { message } }
      : { error: { message, fields } }
  response.status(statusCode).json(body)
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    sendError(response, error.statusCode, error.message, error.fields)
    return
  }

  if (isInvalidJson(error)) {
    sendError(response, 400, 'Invalid JSON body')
    return
  }

  if (isBodyTooLarge(error)) {
    sendError(response, 413, 'Request body is too large')
    return
  }

  if (isDatabaseError(error) || error instanceof Error) {
    logServerError(error)
    sendError(response, 500, 'Internal server error')
    return
  }

  logServerError(error)
  sendError(response, 500, 'Internal server error')
}
