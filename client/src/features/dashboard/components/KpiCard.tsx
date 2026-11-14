type KpiCardProps = {
  label: string
  value: number
  hint: string
  icon: string
}

export function KpiCard({ label, value, hint, icon }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <span className="kpi-card__icon" aria-hidden="true">
        <i className={icon} />
      </span>
      <div>
        <p className="kpi-card__label">{label}</p>
        <p className="kpi-card__value">{value.toLocaleString('en-US')}</p>
        <p className="kpi-card__hint">{hint}</p>
      </div>
    </article>
  )
}
