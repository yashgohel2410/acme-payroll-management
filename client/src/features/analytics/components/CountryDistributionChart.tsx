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
import type { CountryDistribution } from '../../dashboard/types.ts'
import { countAxisMax, formatCount } from '../formatAnalytics.ts'
import { AnalyticsTooltip, tooltipPayload } from './AnalyticsTooltip.tsx'
import { ChartPanel } from './ChartPanel.tsx'

const axisTick = { fill: '#5d6b7c', fontSize: 12 }

type CountryDistributionChartProps = {
  countries: readonly CountryDistribution[]
}

function countryLabelWidth(names: readonly string[]): number {
  if (typeof document === 'undefined') {
    return 148
  }

  const context = document.createElement('canvas').getContext('2d')
  if (context === null) {
    return 148
  }

  context.font = '12px Segoe UI, system-ui, sans-serif'
  const widest = names.reduce((max, name) => Math.max(max, context.measureText(name).width), 0)
  return Math.ceil(Math.min(240, Math.max(112, widest + 56)))
}

function isCountry(value: unknown): value is CountryDistribution {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return (
    'name' in value &&
    'isoCode' in value &&
    'employeeCount' in value &&
    typeof value.name === 'string' &&
    typeof value.isoCode === 'string' &&
    typeof value.employeeCount === 'number'
  )
}

export function CountryDistributionChart({ countries }: CountryDistributionChartProps) {
  const points = [...countries]
  const emptyNames = points
    .filter((country) => country.employeeCount === 0)
    .map((country) => `${country.name} (${country.isoCode})`)
  const labelWidth = countryLabelWidth(points.map((country) => country.name))
  const plotHeight = Math.max(280, points.length * 48 + 64)

  return (
    <ChartPanel
      title="Employees by country"
      description="Active employees in each country. Countries with no active employees stay on the chart at zero."
      empty={points.length === 0}
      emptyMessage="No countries have been created."
    >
      <div className="analytics-chart" style={{ height: plotHeight }}>
        <div className="analytics-chart__plot" style={{ minWidth: labelWidth + 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#d5dee8" horizontal={false} />
              <XAxis
                type="number"
                tick={axisTick}
                allowDecimals={false}
                domain={[0, countAxisMax(points.map((country) => country.employeeCount))]}
                tickFormatter={(value: number) => formatCount(value)}
              />
              <YAxis type="category" dataKey="name" tick={axisTick} width={labelWidth} interval={0} />
              <Tooltip
                content={(props) => {
                  const country = tooltipPayload(props.payload)
                  if (!isCountry(country)) {
                    return <AnalyticsTooltip active={false} title="" rows={[]} />
                  }

                  return (
                    <AnalyticsTooltip
                      active={props.active}
                      title={`${country.name} (${country.isoCode})`}
                      rows={[{ label: 'Active employees', value: formatCount(country.employeeCount) }]}
                    />
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar
                dataKey="employeeCount"
                name="Active employees"
                fill="#1b6ca8"
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
              />
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
