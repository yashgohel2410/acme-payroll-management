import { memo } from 'react'
import {
  Bar,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SalaryDistribution } from '../../dashboard/types.ts'
import { countAxisMax, employeeShare, formatCount, formatSalaryTotal } from '../formatAnalytics.ts'
import { AnalyticsTooltip, tooltipPayload } from './AnalyticsTooltip.tsx'
import { ChartPanel } from './ChartPanel.tsx'

const axisTick = { fill: '#5d6b7c', fontSize: 12 }
const sliceColors = ['#0e4c78', '#1b7a4e', '#b26a00', '#6b3fa0', '#0e6e8c', '#8a3a4a'] as const

type SalaryDistributionChartProps = {
  salaries: readonly SalaryDistribution[]
}

function isSalary(value: unknown): value is SalaryDistribution {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return (
    'code' in value &&
    'employeeCount' in value &&
    'totalAmount' in value &&
    typeof value.code === 'string' &&
    typeof value.employeeCount === 'number' &&
    typeof value.totalAmount === 'number'
  )
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function salaryRows(salary: SalaryDistribution, employeeTotal: number): { label: string; value: string }[] {
  return [
    { label: 'Employees', value: formatCount(salary.employeeCount) },
    { label: 'Share', value: `${employeeShare(salary.employeeCount, employeeTotal).toFixed(1)}%` },
    { label: 'Salary total', value: formatSalaryTotal(salary.totalAmount, salary.code) },
  ]
}

export const SalaryDistributionChart = memo(function SalaryDistributionChart({
  salaries,
}: SalaryDistributionChartProps) {
  const points = [...salaries]
  const employeeTotal = points.reduce((sum, salary) => sum + salary.employeeCount, 0)

  return (
    <ChartPanel
      title="Salary distribution by currency"
      description="Current salaries for employees who are not inactive. The pie shows each currency’s share of employees. The column-line chart shows employee counts as columns and each currency’s own salary total as a line."
      empty={points.length === 0}
      emptyMessage="No current salaries are available."
    >
      <div className="analytics-salary">
        <div className="analytics-salary__charts">
          <section className="analytics-salary__chart">
            <h3>Employees by currency</h3>
            <div className="analytics-chart analytics-chart--salary">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={points}
                    dataKey="employeeCount"
                    nameKey="code"
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="72%"
                    paddingAngle={2}
                    label={false}
                    labelLine={false}
                  >
                    {points.map((salary, index) => (
                      <Cell key={salary.code} fill={sliceColors[index % sliceColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={(props) => {
                      const salary = tooltipPayload(props.payload)
                      if (!isSalary(salary)) {
                        return <AnalyticsTooltip active={false} title="" rows={[]} />
                      }

                      return <AnalyticsTooltip active={props.active} title={salary.code} rows={salaryRows(salary, employeeTotal)} />
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="analytics-salary__chart">
            <h3>Employees and salary totals</h3>
            <div className="analytics-chart analytics-chart--salary">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="code" tick={axisTick} interval={0} />
                  <YAxis
                    yAxisId="employees"
                    tick={axisTick}
                    width={48}
                    allowDecimals={false}
                    domain={[0, countAxisMax(points.map((salary) => salary.employeeCount))]}
                    tickFormatter={(value: number) => formatCount(value)}
                  />
                  <YAxis
                    yAxisId="amount"
                    orientation="right"
                    tick={axisTick}
                    width={52}
                    domain={[0, 'auto']}
                    tickFormatter={(value: number) => formatCompact(value)}
                  />
                  <Tooltip
                    content={(props) => {
                      const salary = tooltipPayload(props.payload)
                      if (!isSalary(salary)) {
                        return <AnalyticsTooltip active={false} title="" rows={[]} />
                      }

                      return <AnalyticsTooltip active={props.active} title={salary.code} rows={salaryRows(salary, employeeTotal)} />
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar
                    yAxisId="employees"
                    dataKey="employeeCount"
                    name="Employees"
                    fill="#0e4c78"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  />
                  <Line
                    yAxisId="amount"
                    type="monotone"
                    dataKey="totalAmount"
                    name="Salary total"
                    stroke="#b26a00"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#b26a00' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
        <div className="analytics-salary__totals">
          <h3>Salary totals</h3>
          <p className="analytics-salary__note">Each total stays in its own currency.</p>
          <ul className="analytics-currencies">
            {points.map((salary, index) => (
              <li key={salary.code} className="analytics-currency">
                <p className="analytics-currency__code">
                  <span className="analytics-currency__swatch" style={{ background: sliceColors[index % sliceColors.length] }} />
                  {salary.code}
                </p>
                <p className="analytics-currency__metric">
                  <span>Employees</span>
                  <strong>{formatCount(salary.employeeCount)}</strong>
                </p>
                <p className="analytics-currency__metric">
                  <span>Salary total</span>
                  <strong>{formatSalaryTotal(salary.totalAmount, salary.code)}</strong>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ChartPanel>
  )
})
