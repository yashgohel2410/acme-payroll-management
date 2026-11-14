import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DepartmentDistribution } from '../../dashboard/types.ts'
import { countAxisMax, formatCount } from '../formatAnalytics.ts'
import { AnalyticsTooltip, tooltipPayload } from './AnalyticsTooltip.tsx'
import { ChartPanel } from './ChartPanel.tsx'

const axisTick = { fill: '#5d6b7c', fontSize: 12 }

type DepartmentDistributionChartProps = {
  departments: readonly DepartmentDistribution[]
}

function isDepartment(value: unknown): value is DepartmentDistribution {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return (
    'name' in value &&
    'employeeCount' in value &&
    typeof value.name === 'string' &&
    typeof value.employeeCount === 'number'
  )
}

export function DepartmentDistributionChart({ departments }: DepartmentDistributionChartProps) {
  const points = [...departments]
  const emptyNames = points.filter((department) => department.employeeCount === 0).map((department) => department.name)
  const plotWidth = Math.max(360, points.length * 76)

  return (
    <ChartPanel
      title="Employees by department"
      description="Active employees in each department. Departments with no active employees stay on the chart at zero."
      empty={points.length === 0}
      emptyMessage="No departments have been created."
    >
      <div className="analytics-chart">
        <div className="analytics-chart__plot" style={{ minWidth: plotWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#d5dee8" vertical={false} />
              <XAxis dataKey="name" tick={axisTick} interval={0} angle={-32} textAnchor="end" height={78} />
              <YAxis
                tick={axisTick}
                width={52}
                allowDecimals={false}
                domain={[0, countAxisMax(points.map((department) => department.employeeCount))]}
                tickFormatter={(value: number) => formatCount(value)}
              />
              <Tooltip
                content={(props) => {
                  const department = tooltipPayload(props.payload)
                  if (!isDepartment(department)) {
                    return <AnalyticsTooltip active={false} title="" rows={[]} />
                  }

                  return (
                    <AnalyticsTooltip
                      active={props.active}
                      title={department.name}
                      rows={[{ label: 'Active employees', value: formatCount(department.employeeCount) }]}
                    />
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="employeeCount" name="Active employees" fill="#0e4c78" radius={[6, 6, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {emptyNames.length > 0 ? (
        <p className="analytics-zero">No active employees: {emptyNames.join(', ')}.</p>
      ) : null}
    </ChartPanel>
  )
}
