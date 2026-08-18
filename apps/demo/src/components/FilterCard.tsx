import { useFilterBridge } from '@filterbridge/react'
import { FieldGroup } from './FieldGroup'
import { invoiceFilters } from '../filters'
import type { InferFilterState } from '@filterbridge/core'

type FilterCardProps = {
  bridge: ReturnType<typeof useFilterBridge<typeof invoiceFilters>>
}

type FilterState = InferFilterState<typeof invoiceFilters>

const ALL_TAGS = ['urgent', 'recurring', 'international', 'manual-review'] as const
type Tag = (typeof ALL_TAGS)[number]

const STATUS_OPTIONS = ['draft', 'pending', 'paid', 'failed', 'cancelled'] as const
type Status = (typeof STATUS_OPTIONS)[number]

function isValidStatus(value: string): value is Status {
  return (STATUS_OPTIONS as readonly string[]).includes(value)
}

export function FilterCard({ bridge }: FilterCardProps) {
  const { state, set, clear } = bridge

  function handleTagToggle(tag: Tag) {
    const current = state.tags ?? []
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    set('tags', next as FilterState['tags'])
  }

  function handleIssuedAtFrom(value: string) {
    set('issuedAt', { ...state.issuedAt, from: value || undefined })
  }

  function handleIssuedAtTo(value: string) {
    set('issuedAt', { ...state.issuedAt, to: value || undefined })
  }

  function handleAmountMin(value: string) {
    const num = value === '' ? undefined : Number(value)
    set('amount', { ...state.amount, min: num })
  }

  function handleAmountMax(value: string) {
    const num = value === '' ? undefined : Number(value)
    set('amount', { ...state.amount, max: num })
  }

  // A boolean() filter has three states — true, false, and undefined (not
  // filtering). A checkbox only has two, so it can never get back to undefined.
  function handleArchived(value: string) {
    if (value === '') {
      clear('archived')
      return
    }
    set('archived', value === 'true')
  }

  return (
    <div className="filter-card">
      <FieldGroup label="Search">
        {(id) => (
          <div className="input-with-clear">
            <input
              id={id}
              className="text-input"
              type="text"
              value={state.search ?? ''}
              onChange={(e) => set('search', e.target.value || undefined)}
              placeholder="Search invoices..."
            />
            {state.search && (
              <button className="clear-btn" onClick={() => clear('search')} title="Clear search">
                ×
              </button>
            )}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Status">
        {(id) => (
          <div className="input-with-clear">
            <select
              id={id}
              className="select-input"
              value={state.status ?? ''}
              onChange={(e) => {
                const val = e.target.value
                set('status', isValidStatus(val) ? val : undefined)
              }}
            >
              <option value="">Any status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            {state.status && (
              <button className="clear-btn" onClick={() => clear('status')} title="Clear status">
                ×
              </button>
            )}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Tags" hint="multiSelect" group>
        {() => (
          <div className="checkbox-group">
            {ALL_TAGS.map((tag) => (
              <label key={tag} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(state.tags ?? []).includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                />
                <span>{tag}</span>
              </label>
            ))}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Archived" hint="boolean">
        {(id) => (
          <div className="input-with-clear">
            <select
              id={id}
              className="select-input"
              value={state.archived === undefined ? '' : String(state.archived)}
              onChange={(e) => handleArchived(e.target.value)}
            >
              <option value="">Any — not filtering</option>
              <option value="true">Yes — archived only</option>
              <option value="false">No — active only</option>
            </select>
            {state.archived !== undefined && (
              <button
                className="clear-btn"
                onClick={() => clear('archived')}
                title="Clear archived"
              >
                ×
              </button>
            )}
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Issued At" hint="dateRange" group>
        {(id) => (
          <>
            <div className="range-row">
              <div className="range-field">
                <label className="range-label" htmlFor={`${id}-from`}>
                  <span className="sr-only">Issued at </span>From
                </label>
                <input
                  id={`${id}-from`}
                  className="date-input"
                  type="date"
                  value={state.issuedAt?.from ?? ''}
                  onChange={(e) => handleIssuedAtFrom(e.target.value)}
                />
              </div>
              <div className="range-field">
                <label className="range-label" htmlFor={`${id}-to`}>
                  <span className="sr-only">Issued at </span>To
                </label>
                <input
                  id={`${id}-to`}
                  className="date-input"
                  type="date"
                  value={state.issuedAt?.to ?? ''}
                  onChange={(e) => handleIssuedAtTo(e.target.value)}
                />
              </div>
            </div>
            {(state.issuedAt?.from || state.issuedAt?.to) && (
              <button className="clear-text-btn" onClick={() => clear('issuedAt')}>
                Clear dates
              </button>
            )}
          </>
        )}
      </FieldGroup>

      <FieldGroup label="Amount" hint="numberRange" group>
        {(id) => (
          <>
            <div className="range-row">
              <div className="range-field">
                <label className="range-label" htmlFor={`${id}-min`}>
                  <span className="sr-only">Amount </span>Min
                </label>
                <input
                  id={`${id}-min`}
                  className="number-input"
                  type="number"
                  value={state.amount?.min ?? ''}
                  onChange={(e) => handleAmountMin(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div className="range-field">
                <label className="range-label" htmlFor={`${id}-max`}>
                  <span className="sr-only">Amount </span>Max
                </label>
                <input
                  id={`${id}-max`}
                  className="number-input"
                  type="number"
                  value={state.amount?.max ?? ''}
                  onChange={(e) => handleAmountMax(e.target.value)}
                  placeholder="∞"
                  min={0}
                />
              </div>
            </div>
            {(state.amount?.min !== undefined || state.amount?.max !== undefined) && (
              <button className="clear-text-btn" onClick={() => clear('amount')}>
                Clear amount
              </button>
            )}
          </>
        )}
      </FieldGroup>
    </div>
  )
}
