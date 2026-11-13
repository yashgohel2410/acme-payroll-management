import axios, { type AxiosInstance } from 'axios'

function readApiBaseUrl(): string | undefined {
  const configured: unknown = import.meta.env.VITE_API_BASE_URL

  if (typeof configured !== 'string') {
    return undefined
  }

  const trimmed = configured.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: readApiBaseUrl(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})
