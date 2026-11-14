import type { ReactNode } from 'react'

type ChartPanelProps = {
  title: string
  description: string
  empty: boolean
  emptyMessage: string
  children: ReactNode
}

export function ChartPanel({ title, description, empty, emptyMessage, children }: ChartPanelProps) {
  return (
    <article className="dashboard-panel">
      <header className="dashboard-panel__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {empty ? <p className="dashboard-empty">{emptyMessage}</p> : children}
    </article>
  )
}
