import axios from 'axios'
import { describe, expect, it } from 'vitest'
import { readApiErrorMessage, serviceUnavailableMessage } from './apiError.ts'

describe('API error messages', () => {
  it('explains a missing connection instead of a raw network error', () => {
    const error = new axios.AxiosError('Network Error')

    expect(readApiErrorMessage(error, 'Fallback')).toBe(serviceUnavailableMessage)
  })

  it('uses the server message when the API responds', () => {
    const error = new axios.AxiosError('Request failed')
    error.response = {
      data: { error: { message: 'Employee not found' } },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    }

    expect(readApiErrorMessage(error, 'Fallback')).toBe('Employee not found')
  })

  it('falls back when the failure has no message', () => {
    expect(readApiErrorMessage(new Error('   '), 'Fallback')).toBe('Fallback')
  })
})
