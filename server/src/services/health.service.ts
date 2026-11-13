export type HealthReport = {
  status: 'ok'
  service: 'acme-payroll-management'
  timestamp: string
}

export function getHealthReport(): HealthReport {
  return {
    status: 'ok',
    service: 'acme-payroll-management',
    timestamp: new Date().toISOString(),
  }
}
