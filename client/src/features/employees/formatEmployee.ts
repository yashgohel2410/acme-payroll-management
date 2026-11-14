import type { EmployeeCurrency } from './types.ts'

export function formatEmployeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

export function formatEmploymentStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => (part.length === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(' ')
}

export function formatCurrentSalary(
  salary: { amount: number; currency: EmployeeCurrency } | null,
): string {
  if (salary === null) {
    return '—'
  }

  const digits = salary.currency.minorUnitDigits
  if (!Number.isInteger(digits) || digits < 0 || digits > 8) {
    return `${salary.amount.toLocaleString('en-US')} ${salary.currency.code}`
  }

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: salary.currency.code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(salary.amount / 10 ** digits)

    return `${formatted} ${salary.currency.code}`
  } catch {
    return `${salary.amount.toLocaleString('en-US')} ${salary.currency.code}`
  }
}
