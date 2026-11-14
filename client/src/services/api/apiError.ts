import axios from 'axios'

export const serviceUnavailableMessage =
  'The payroll service is unavailable. Check your connection and try again.'

function readErrorMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return null
  }

  const body: unknown = data.error
  if (typeof body !== 'object' || body === null || !('message' in body) || typeof body.message !== 'string') {
    return null
  }

  const message = body.message.trim()
  return message.length > 0 ? message : null
}

export function readApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response === undefined) {
      return serviceUnavailableMessage
    }

    const message = readErrorMessage(error.response.data)
    if (message !== null) {
      return message
    }

    if (error.response.status >= 500) {
      return serviceUnavailableMessage
    }
  }

  if (error instanceof Error && error.message.trim().length > 0 && !axios.isAxiosError(error)) {
    return error.message
  }

  return fallback
}
