type TooltipRow = {
  label: string
  value: string
}

type AnalyticsTooltipProps = {
  active?: boolean
  title: string
  rows: readonly TooltipRow[]
}

export function AnalyticsTooltip({ active, title, rows }: AnalyticsTooltipProps) {
  if (active !== true) {
    return null
  }

  return (
    <div className="dashboard-tooltip">
      <p className="dashboard-tooltip__label">{title}</p>
      {rows.map((row) => (
        <p key={row.label}>
          {row.label}: {row.value}
        </p>
      ))}
    </div>
  )
}

export function tooltipPayload(payload: readonly { payload?: unknown }[] | undefined): unknown {
  return payload?.[0]?.payload
}
