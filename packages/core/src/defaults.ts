import type { AnyFilter } from './filter-types'
import type { InferFilterState } from './infer'

/**
 * The filter's configured default, or `undefined` if it has none.
 *
 * Only `select`, `multiSelect` and `boolean` can have one — the filters whose
 * value space is a fixed, enumerable set. `text`, `dateRange` and `numberRange`
 * always answer `undefined` here because their builders do not accept a
 * default at all.
 *
 * Arrays are copied on the way out: the schema is a long-lived module-level
 * object, and handing out a live reference would let a caller mutate every
 * future parse through the state it was just given.
 */
export function filterDefault(filter: AnyFilter): unknown {
  switch (filter._kind) {
    case 'select':
    case 'boolean':
      return filter.default
    case 'multiSelect':
      return filter.default === undefined ? undefined : [...filter.default]
    case 'text':
    case 'dateRange':
    case 'numberRange':
      return undefined
  }
}

/**
 * Whether an already-normalized outgoing value equals the filter's default.
 *
 * `toSearchParams` uses this to omit the value: a filter at its default
 * produces no param, and `parseFilters` puts the default back when the param is
 * missing. `@filterbridge/react` uses it for `activeFilterCount`, so "active"
 * and "appears in the URL" cannot drift apart.
 *
 * Comparison is positional for `multiSelect` — a reordered selection is a
 * different state, so it still reaches the URL and the round trip stays exact.
 */
export function isAtDefault(filter: AnyFilter, value: unknown): boolean {
  switch (filter._kind) {
    case 'select':
    case 'boolean':
      return filter.default !== undefined && filter.default === value

    case 'multiSelect': {
      const expected = filter.default
      if (expected === undefined || !Array.isArray(value)) return false
      return expected.length === value.length && expected.every((v, i) => v === value[i])
    }

    case 'text':
    case 'dateRange':
    case 'numberRange':
      return false
  }
}

/**
 * The state a schema starts from: every filter that declares a default, at that
 * default. Filters without one are absent, exactly as they are after parsing an
 * empty query string.
 *
 * `parseFilters(schema, {})` returns the same object; this is the way to get it
 * without an input. `@filterbridge/react` uses it to keep hook state inside the
 * range of `parseFilters` — see `docs/decisions/002-default-values.md`.
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
