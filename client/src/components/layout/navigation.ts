import { routePaths } from '../../app/routePaths.ts'

export type NavItem = {
  label: string
  to: string
  icon: string
  end?: boolean
}

export const primaryNavItems: readonly NavItem[] = [
  { label: 'Dashboard', to: routePaths.dashboard, icon: 'pi pi-home', end: true },
  { label: 'Employees', to: routePaths.employees, icon: 'pi pi-users', end: true },
  { label: 'New employee', to: routePaths.newEmployee, icon: 'pi pi-user-plus', end: true },
  { label: 'Salaries', to: routePaths.salaries, icon: 'pi pi-wallet', end: true },
  { label: 'Salary history', to: routePaths.salaryHistory, icon: 'pi pi-history', end: true },
  { label: 'Analytics', to: routePaths.analytics, icon: 'pi pi-chart-bar', end: true },
]

export function resolvePageTitle(pathname: string): string {
  if (pathname === routePaths.newEmployee) {
    return 'New employee'
  }

  if (pathname.startsWith(`${routePaths.employees}/`)) {
    return 'Employee profile'
  }

  if (pathname === routePaths.employees) {
    return 'Employees'
  }

  if (pathname === routePaths.salaryHistory) {
    return 'Salary history'
  }

  if (pathname === routePaths.salaries) {
    return 'Salaries'
  }

  if (pathname === routePaths.analytics) {
    return 'Analytics'
  }

  if (pathname === routePaths.dashboard) {
    return 'Dashboard'
  }

  return 'ACME Payroll'
}
