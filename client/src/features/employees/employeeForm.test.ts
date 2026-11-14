import { describe, expect, it } from 'vitest'
import { emptyEmployeeForm, parseEmployeeForm, todayIsoDate } from './employeeForm.ts'
import { parseSalaryRevision } from './salaryRevision.ts'
import type { EmployeeCurrency, EmployeeFormValues } from './types.ts'

const inr: EmployeeCurrency = {
  id: 1,
  code: 'INR',
  name: 'Indian Rupee',
  minorUnitDigits: 2,
}

function validEmployee(overrides: Partial<EmployeeFormValues> = {}): EmployeeFormValues {
  const today = todayIsoDate()
  return {
    ...emptyEmployeeForm,
    employeeCode: 'EMP-9',
    firstName: 'Asha',
    lastName: 'Shah',
    email: 'asha@example.com',
    phone: '12345',
    designation: 'Analyst',
    dateOfJoining: today,
    departmentId: 2,
    countryId: 3,
    amount: '1000',
    currencyId: 1,
    effectiveFrom: today,
    ...overrides,
  }
}

describe('employee form validation', () => {
  it('rejects a joining date in the past', () => {
    const result = parseEmployeeForm(validEmployee({ dateOfJoining: '2000-01-01', effectiveFrom: '2000-01-01' }), [inr])

    expect(result).toEqual({
      fieldErrors: expect.objectContaining({
        dateOfJoining: 'Date of joining cannot be in the past',
      }) as unknown,
    })
  })

  it('requires a phone number of at least 5 characters', () => {
    const result = parseEmployeeForm(validEmployee({ phone: '1234' }), [inr])

    expect('fieldErrors' in result).toBe(true)
    if ('fieldErrors' in result) {
      expect(result.fieldErrors.phone).toBeTruthy()
    }
  })

  it('converts a valid amount into minor units', () => {
    const result = parseEmployeeForm(validEmployee(), [inr])

    expect(result).toMatchObject({
      payload: {
        employeeCode: 'EMP-9',
        amount: 100000,
        currencyId: 1,
        employmentStatus: 'ACTIVE',
      },
    })
  })
})

describe('salary revision validation', () => {
  it('requires the amount, currency, date, and reason', () => {
    const result = parseSalaryRevision(
      { amount: '', currencyId: null, effectiveFrom: '', reason: ' ' },
      [inr],
    )

    expect(result).toEqual({
      fieldErrors: {
        amount: 'Amount is required',
        currencyId: 'Select a currency',
        effectiveFrom: 'Effective date is required',
        reason: 'Reason is required',
      },
    })
  })

  it('returns minor units for a valid revision', () => {
    const result = parseSalaryRevision(
      { amount: '25.50', currencyId: 1, effectiveFrom: '2026-11-14', reason: 'Annual review' },
      [inr],
    )

    expect(result).toEqual({
      payload: {
        amount: 2550,
        currencyId: 1,
        effectiveFrom: '2026-11-14',
        reason: 'Annual review',
      },
    })
  })
})
