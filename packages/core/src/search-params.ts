import { isAtDefault } from './defaults'
import type { AnyFilter, DateRangeValue, NumberRangeValue } from './filter-types'
import { isValidOption, validOptions, warnDroppedValue } from './filter-validation'
import type { InferFilterState } from './infer'
import { dateRangeParamKeys, numberRangeParamKeys, scalarParamKey } from './param-keys'

export function toSearchParams<S extends Record<string, AnyFilter>>(
  schema: S,
  state: InferFilterState<S>
): URLSearchParams {
  const params = new URLSearchParams()
  const raw = state as Record<string, unknown>

  // `name` indexes the state and the schema; the param it writes is derived
  // from it by param-keys.ts and is not necessarily the same string. Warnings
  // keep naming the filter rather than the param — a dropped value is a problem
  // with the schema's field, and that is what the caller went looking for.
  for (const [name, filter] of Object.entries(schema)) {
    const value = raw[name]
    if (value === undefined || value === null) continue

    switch (filter._kind) {
      case 'text': {
        // Trimmed on the way out, exactly as parseFilters trims on the way in,
        // so `' foo '` and `'foo'` produce the same URL.
        const trimmed = typeof value === 'string' ? value.trim() : ''
        if (trimmed) {
          params.set(scalarParamKey(name, filter), trimmed)
        }
        break
      }

      case 'select':
        if (isValidOption(filter, value)) {
          if (!isAtDefault(filter, value)) {
            params.set(scalarParamKey(name, filter), value)
          }
        } else {
          warnDroppedValue('toSearchParams', name, filter, value)
        }
        break

      case 'multiSelect': {
        if (!Array.isArray(value)) break
        const valid = validOptions(filter, value)
        for (const entry of value) {
          if (!isValidOption(filter, entry)) {
            warnDroppedValue('toSearchParams', name, filter, entry)
          }
        }
        if (valid.length > 0 && !isAtDefault(filter, valid)) {
          params.set(scalarParamKey(name, filter), valid.join(','))
        }
        break
      }

      case 'boolean':
        if (typeof value === 'boolean' && !isAtDefault(filter, value)) {
          params.set(scalarParamKey(name, filter), String(value))
        }
        break

      case 'dateRange': {
        const range = value as DateRangeValue
        const next: DateRangeValue = {}
        if (typeof range.from === 'string' && range.from.trim()) next.from = range.from.trim()
        if (typeof range.to === 'string' && range.to.trim()) next.to = range.to.trim()
        const keys = dateRangeParamKeys(name, filter)
        if (next.from !== undefined) params.set(keys.from, next.from)
        if (next.to !== undefined) params.set(keys.to, next.to)
        break
      }

      case 'numberRange': {
        const range = value as NumberRangeValue
        const next: NumberRangeValue = {}
        if (Number.isFinite(range.min)) next.min = range.min
        if (Number.isFinite(range.max)) next.max = range.max
        const keys = numberRangeParamKeys(name, filter)
        if (next.min !== undefined) params.set(keys.min, String(next.min))
        if (next.max !== undefined) params.set(keys.max, String(next.max))
        break
      }
    }
  }

  return params
}
