type FieldGroupProps = {
  label: string
  children: React.ReactNode
  hint?: string
}

export function FieldGroup({ label, children, hint }: FieldGroupProps) {
  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </label>
      <div className="field-control">{children}</div>
    </div>
  )
}
