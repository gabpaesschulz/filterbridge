import type { AnyFilter, DateRangeValue, NumberRangeValue } from './filter-types'
import type { InferFilterState } from './infer'

/**
 * The filter's configured default, or `undefined` if it has none.
 *
 * Arrays and range objects are copied on the way out: the schema is a
 * long-lived module-level object, and handing out a live reference would let a
 * caller mutate every future parse through the state it was just given.
 */
export function filterDefault(filter: AnyFilter): unknown {
  switch (filter._kind) {
    case 'text':
    case 'select':
    case 'boolean':
      return filter.default
    case 'multiSelect':
      return filter.default === undefined ? undefined : [...filter.default]
    case 'dateRange':
    case 'numberRange':
      return filter.default === undefined ? undefined : { ...filter.default }
  }
}

/**
 * Whether an already-normalized outgoing value equals the filter's default.
 *
 * Serializers use this to omit the value: a filter at its default produces no
 * param, and `parseFilters` puts the default back when the param is missing.
 * Comparison is positional for `multiSelect` — a reordered selection is a
 * different state, so it still reaches the URL and the round trip stays exact.
 */
export function isAtDefault(filter: AnyFilter, value: unknown): boolean {
  switch (filter._kind) {
    case 'text':
    case 'select':
    case 'boolean':
      return filter.default !== undefined && filter.default === value

    case 'multiSelect': {
      const expected = filter.default
      if (expected === undefined || !Array.isArray(value)) return false
      return expected.length === value.length && expected.every((v, i) => v === value[i])
    }

    case 'dateRange': {
      const expected = filter.default
      if (expected === undefined) return false
      const range = value as DateRangeValue
      return expected.from === range.from && expected.to === range.to
    }

    case 'numberRange': {
      const expected = filter.default
      if (expected === undefined) return false
      const range = value as NumberRangeValue
      return expected.min === range.min && expected.max === range.max
    }
  }
}

/**
 * The state a schema starts from: every filter that declares a default, at that
 * default. Filters without one are absent, exactly as they are after parsing an
 * empty query string.
 *
 * `parseFilters(schema, {})` returns the same object; this is the way to get it
 * without an input, e.g. to merge defaults back into a `toQueryDto` result.
 */
export function getDefaultFilterState<S extends Record<string, AnyFilter>>(
  schema: S
): InferFilterState<S> {
  const result: Record<string, unknown> = {}

  for (const [key, filter] of Object.entries(schema)) {
    const value = filterDefault(filter)
    if (value !== undefined) result[key] = value
  }

  return result as InferFilterState<S>
}
