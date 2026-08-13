import { useId } from 'react'

type FieldGroupProps = {
  label: string
  hint?: string
  /**
   * Set when the field holds more than one control (a checkbox list, a range
   * pair). A `<label htmlFor>` can only name a single control, so grouped
   * fields become an ARIA group instead and each inner control carries its own
   * label.
   */
  group?: boolean
  /**
   * Receives a generated id. Ungrouped fields put it on the single control the
   * visible label names; grouped fields use it as a prefix for their sub-ids.
   */
  children: (controlId: string) => React.ReactNode
}

export function FieldGroup({ label, children, hint, group = false }: FieldGroupProps) {
  const controlId = useId()
  const labelId = `${controlId}-label`

  // The builder-name chip sits outside the label so it never becomes part of
  // the field's accessible name.
  const header = (
    <div className="field-label-row">
      {group ? (
        <span className="field-label" id={labelId}>
          {label}
        </span>
      ) : (
        <label className="field-label" htmlFor={controlId}>
          {label}
        </label>
      )}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )

  if (group) {
    return (
      <div className="field-group" role="group" aria-labelledby={labelId}>
        {header}
        <div className="field-control">{children(controlId)}</div>
      </div>
    )
  }

  return (
    <div className="field-group">
      {header}
      <div className="field-control">{children(controlId)}</div>
    </div>
  )
}
