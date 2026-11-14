import { memo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type DistributionPoint = {
  label: string
  value: number
  caption: string
}

type ChartType = 'bar' | 'line'

type DistributionChartProps = {
  title: string
  description: string
  points: readonly DistributionPoint[]
  emptyMessage: string
  valueName: string
  compactAxis: boolean
}

const axisTick = { fill: '#5d6b7c', fontSize: 12 }

function isDistributionPoint(value: unknown): value is DistributionPoint {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (!('label' in value) || !('value' in value) || !('caption' in value)) {
    return false
  }

  return typeof value.label === 'string' && typeof value.value === 'number' && typeof value.caption === 'string'
}

function formatAxis(value: number, compact: boolean): string {
  if (!compact) {
    return value.toLocaleString('en-US')
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  const entry = payload?.[0]
  if (active !== true || entry === undefined || !isDistributionPoint(entry.payload)) {
    return null
  }

  return (
    <div className="dashboard-tooltip">
      <p className="dashboard-tooltip__label">{entry.payload.label}</p>
      <p>{entry.payload.value.toLocaleString('en-US')}</p>
      <p>{entry.payload.caption}</p>
    </div>
  )
}

function ChartTypeToggle({
  title,
  chartType,
  onChange,
}: {
  title: string
  chartType: ChartType
  onChange: (chartType: ChartType) => void
}) {
  return (
    <div className="chart-toggle" role="group" aria-label={`${title} chart type`}>
      <button type="button" aria-pressed={chartType === 'bar'} onClick={() => onChange('bar')}>
        <i className="pi pi-chart-bar" aria-hidden="true" />
        Bar
      </button>
      <button type="button" aria-pressed={chartType === 'line'} onClick={() => onChange('line')}>
        <i className="pi pi-chart-line" aria-hidden="true" />
        Line
      </button>
    </div>
  )
}

export const DistributionChart = memo(function DistributionChart({
  title,
  description,
  points,
  emptyMessage,
  valueName,
  compactAxis,
}: DistributionChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const chartData = [...points]
  const tooltip = (
    <Tooltip
      content={(props) => (
        <ChartTooltip active={props.active} payload={props.payload.map((item) => ({ payload: item.payload }))} />
      )}
    />
  )
  const categoryAxis = (
    <XAxis
      dataKey="label"
      tick={axisTick}
      interval={0}
      angle={-32}
      textAnchor="end"
      height={72}
    />
  )
  const valueAxis = (
    <YAxis
      tick={axisTick}
      width={52}
      domain={[0, 'auto']}
      tickFormatter={(value: number) => formatAxis(value, compactAxis)}
    />
  )

  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {points.length > 0 ? (
          <ChartTypeToggle title={title} chartType={chartType} onChange={setChartType} />
        ) : null}
      </header>
      {points.length === 0 ? (
        <p className="dashboard-empty">{emptyMessage}</p>
      ) : (
        <div className="dashboard-chart">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#d5dee8" vertical={false} />
                {categoryAxis}
                {valueAxis}
                {tooltip}
                <Bar dataKey="value" name={valueName} fill="#0e4c78" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#d5dee8" vertical={false} />
                {categoryAxis}
                {valueAxis}
                {tooltip}
                <Line
                  type="monotone"
                  dataKey="value"
                  name={valueName}
                  stroke="#0e4c78"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0e4c78' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </article>
  )
})
