import { useEffect, useState } from 'react'
import { loadDashboard, readApiErrorMessage } from './services/dashboardApi.ts'
import type { DashboardData } from './types.ts'

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardData }

export function useDashboard(requestId: number): DashboardState {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })

    loadDashboard()
      .then((data) => {
        if (active) {
          setState({ status: 'ready', data })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: 'error', message: readApiErrorMessage(error) })
        }
      })

    return () => {
      active = false
    }
  }, [requestId])

  return state
}
