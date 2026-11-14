import { describe, expect, it } from 'vitest'
import { countAxisMax, employeeShare, formatSalaryTotal } from './formatAnalytics.ts'

describe('analytics formatting', () => {
  it('formats a salary total in its own currency', () => {
    expect(formatSalaryTotal(8_000_000, 'INR')).toBe('₹80,000.00 INR')
    expect(formatSalaryTotal(0, 'USD')).toBe('$0.00 USD')
    expect(formatSalaryTotal(100, 'AED').match(/AED/g)).toEqual(['AED'])
  })

  it('keeps an unknown currency code with the minor-unit amount', () => {
    expect(formatSalaryTotal(1_500, 'NOTACURRENCY')).toBe('1,500 NOTACURRENCY')
  })

  it('keeps a zero-only axis readable and avoids comparing an empty share', () => {
    expect(countAxisMax([0, 0])).toBe(1)
    expect(countAxisMax([])).toBe(1)
    expect(countAxisMax([4, 0])).toBe('auto')
    expect(employeeShare(0, 10)).toBe(0)
    expect(employeeShare(4, 0)).toBe(0)
    expect(employeeShare(2, 8)).toBe(25)
  })
})
