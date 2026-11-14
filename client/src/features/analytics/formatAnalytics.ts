export function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

export function countAxisMax(values: readonly number[]): number | 'auto' {
  const highest = values.reduce((max, value) => (value > max ? value : max), 0)
  return highest === 0 ? 1 : 'auto'
}

export function formatSalaryTotal(amount: number, code: string): string {
  if (!Number.isFinite(amount)) {
    return code
  }

  try {
    const digits = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).resolvedOptions().maximumFractionDigits

    if (digits === undefined || !Number.isInteger(digits) || digits < 0 || digits > 8) {
      return `${amount.toLocaleString('en-US')} ${code}`
    }

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount / 10 ** digits)

    return formatted.includes(code) ? formatted : `${formatted} ${code}`
  } catch {
    return `${amount.toLocaleString('en-US')} ${code}`
  }
}

export function employeeShare(count: number, total: number): number {
  if (total <= 0 || count <= 0) {
    return 0
  }

  return Math.min(100, (count / total) * 100)
}
