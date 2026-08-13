import { isAtDefault } from './defaults'
import type { AnyFilter, DateRangeValue, NumberRangeValue } from './filter-types'
import { isValidOption, validOptions, warnDroppedValue } from './filter-validation'
import type { InferFilterState } from './infer'

export function toSearchParams<S extends Record<string, AnyFilter>>(
  schema: S,
  state: InferFilterState<S>
): URLSearchParams {
  const params = new URLSearchParams()
  const raw = state as Record<string, unknown>

  for (const [key, filter] of Object.entries(schema)) {
    const value = raw[key]
    if (value === undefined || value === null) continue

    switch (filter._kind) {
      case 'text': {
        // Trimmed on the way out, exactly as parseFilters trims on the way in,
        // so `' foo '` and `'foo'` produce the same URL.
        const trimmed = typeof value === 'string' ? value.trim() : ''
        if (trimmed) {
          params.set(key, trimmed)
        }
        break
      }

      case 'select':
        if (isValidOption(filter, value)) {
          if (!isAtDefault(filter, value)) {
            params.set(key, value)
          }
        } else {
          warnDroppedValue('toSearchParams', key, filter, value)
        }
        break

      case 'multiSelect': {
        if (!Array.isArray(value)) break
        const valid = validOptions(filter, value)
        for (const entry of value) {
          if (!isValidOption(filter, entry)) {
            warnDroppedValue('toSearchParams', key, filter, entry)
          }
        }
        if (valid.length > 0 && !isAtDefault(filter, valid)) {
          params.set(key, valid.join(','))
        }
        break
      }

      case 'boolean':
        if (typeof value === 'boolean' && !isAtDefault(filter, value)) {
          params.set(key, String(value))
        }
        break

      case 'dateRange': {
        const range = value as DateRangeValue
        const next: DateRangeValue = {}
        if (typeof range.from === 'string' && range.from.trim()) next.from = range.from.trim()
        if (typeof range.to === 'string' && range.to.trim()) next.to = range.to.trim()
        if (next.from !== undefined) params.set(`${key}From`, next.from)
        if (next.to !== undefined) params.set(`${key}To`, next.to)
        break
      }

      case 'numberRange': {
        const range = value as NumberRangeValue
        const next: NumberRangeValue = {}
        if (Number.isFinite(range.min)) next.min = range.min
        if (Number.isFinite(range.max)) next.max = range.max
        if (next.min !== undefined) params.set(`${key}Min`, String(next.min))
        if (next.max !== undefined) params.set(`${key}Max`, String(next.max))
        break
      }
    }
  }

  return params
}
