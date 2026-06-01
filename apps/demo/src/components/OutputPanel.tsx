type OutputPanelProps = {
  title: string
  children: React.ReactNode
  badge?: string
}

export function OutputPanel({ title, children, badge }: OutputPanelProps) {
  return (
    <div className="output-panel">
      <div className="output-panel-header">
        <h3 className="output-panel-title">{title}</h3>
        {badge && <span className="output-badge">{badge}</span>}
      </div>
      <div className="output-panel-body">{children}</div>
    </div>
  )
}
