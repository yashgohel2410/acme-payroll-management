import { useEffect, useState } from 'react'
import { loadAnalytics, readAnalyticsError } from './services/analyticsApi.ts'
import type { AnalyticsData } from './types.ts'

type AnalyticsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AnalyticsData }

export function useAnalytics(requestId: number): AnalyticsState {
  const [state, setState] = useState<AnalyticsState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })

    loadAnalytics()
      .then((data) => {
        if (active) {
          setState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: 'error', message: readAnalyticsError(error) })
        }
      })

    return () => {
      active = false
    }
  }, [requestId])

  return state
}
