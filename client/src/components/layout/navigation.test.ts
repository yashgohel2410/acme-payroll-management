import { describe, expect, it } from 'vitest'
import { resolvePageTitle } from './navigation.ts'

describe('page titles', () => {
  it('names each primary route', () => {
    expect(resolvePageTitle('/')).toBe('ACME Payroll')
    expect(resolvePageTitle('/dashboard')).toBe('Dashboard')
    expect(resolvePageTitle('/employees')).toBe('Employees')
    expect(resolvePageTitle('/employees/new')).toBe('New employee')
    expect(resolvePageTitle('/employees/12')).toBe('Employee profile')
    expect(resolvePageTitle('/employees/12/edit')).toBe('Edit employee')
    expect(resolvePageTitle('/salaries')).toBe('Salaries')
    expect(resolvePageTitle('/salaries/history')).toBe('Salary history')
    expect(resolvePageTitle('/analytics')).toBe('Analytics')
  })
})
