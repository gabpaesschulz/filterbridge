import type {
  BooleanFilter,
  DateRangeFilter,
  DateRangeValue,
  MultiSelectFilter,
  NumberRangeFilter,
  NumberRangeValue,
  SelectFilter,
  TextFilter,
} from './filter-types'
import { assertValidDefaults } from './filter-validation'

/**
 * Shared configuration accepted as the last argument of every filter builder.
 *
 * `default` is the value `parseFilters` uses when the key is absent from the
 * input or present but invalid. It is also the value the serializers omit, so a
 * filter sitting at its default produces no query param at all.
 */
export interface FilterConfig<TValue> {
  readonly default?: TValue
}

/**
 * Defaults are normalized once, here, to the exact shape the parsers produce —
 * a trimmed string, a range without empty sides. Otherwise `{ from: '' }` as a
 * default would never compare equal to the parsed `{}` and the round trip would
 * emit a param for a filter that is at its default.
 */
export function text(config?: FilterConfig<string>): TextFilter {
  const value = typeof config?.default === 'string' ? config.default.trim() : ''
  return value ? { _kind: 'text', default: value } : { _kind: 'text' }
}

export function select<const T extends readonly string[]>(
  options: T,
  config?: FilterConfig<T[number]>
): SelectFilter<T> {
  if (config?.default === undefined) return { _kind: 'select', options }
  assertValidDefaults('select', options, [config.default])
  return { _kind: 'select', options, default: config.default }
}

export function multiSelect<const T extends readonly string[]>(
  options: T,
  config?: FilterConfig<ReadonlyArray<T[number]>>
): MultiSelectFilter<T> {
  const values = config?.default
  // An empty default selects nothing, which is what no default already means.
  if (values === undefined || values.length === 0) return { _kind: 'multiSelect', options }
  assertValidDefaults('multiSelect', options, values)
  return { _kind: 'multiSelect', options, default: [...values] }
}

export function boolean(config?: FilterConfig<boolean>): BooleanFilter {
  return typeof config?.default === 'boolean'
    ? { _kind: 'boolean', default: config.default }
    : { _kind: 'boolean' }
}

export function dateRange(config?: FilterConfig<DateRangeValue>): DateRangeFilter {
  const value = config?.default
  if (value === undefined) return { _kind: 'dateRange' }

  const next: DateRangeValue = {}
  if (typeof value.from === 'string' && value.from.trim()) next.from = value.from.trim()
  if (typeof value.to === 'string' && value.to.trim()) next.to = value.to.trim()

  return next.from !== undefined || next.to !== undefined
    ? { _kind: 'dateRange', default: next }
    : { _kind: 'dateRange' }
}

export function numberRange(config?: FilterConfig<NumberRangeValue>): NumberRangeFilter {
  const value = config?.default
  if (value === undefined) return { _kind: 'numberRange' }

  const next: NumberRangeValue = {}
  if (Number.isFinite(value.min)) next.min = value.min
  if (Number.isFinite(value.max)) next.max = value.max

  return next.min !== undefined || next.max !== undefined
    ? { _kind: 'numberRange', default: next }
    : { _kind: 'numberRange' }
}
