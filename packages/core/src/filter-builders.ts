import type {
  BooleanFilter,
  DateRangeFilter,
  DateRangeKeys,
  MultiSelectFilter,
  NumberRangeFilter,
  NumberRangeKeys,
  SelectFilter,
  TextFilter,
} from './filter-types'
import { assertValidDefaults, assertValidParamKeys } from './filter-validation'

/**
 * Configuration accepted as the last argument of the filter builders that take
 * one: `select`, `multiSelect` and `boolean`.
 *
 * `default` is the value `parseFilters` uses when the key is absent from the
 * input or present but invalid. It is also the value `toSearchParams` omits, so
 * a filter sitting at its default produces no query param at all.
 *
 * `text`, `dateRange` and `numberRange` deliberately do not accept one — see
 * the note on each, and `docs/decisions/002-default-values.md`.
 */
export interface FilterConfig<TValue> {
  readonly default?: TValue
}

/**
 * No `default`. Under the hook's defaults rule, clearing a filter means
 * returning it to its default — which is coherent for a discrete choice and
 * hostile for free text: deleting is continuous editing, so the input would
 * repopulate itself while the user is still backspacing through it.
 */
export function text(): TextFilter {
  return { _kind: 'text' }
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

/**
 * Configuration for `dateRange`. `keys` overrides the URL param names the
 * filter reads and writes; either side may be given alone.
 *
 * There is no `default` here, and there will not be. A literal date default is
 * wrong by construction: `'2026-01-01'` means something different every month
 * and goes stale on its own. The case it would serve — "last 30 days" — is a
 * discrete choice and belongs in a `select(['7d', '30d', '90d'], { default:
 * '30d' })`.
 */
export interface DateRangeConfig {
  readonly keys?: DateRangeKeys
}

/**
 * Configuration for `numberRange`. `keys` overrides the URL param names.
 *
 * No `default`, for the same reason as `text`: a number input passes through
 * the empty string as an ordinary step of editing — backspacing `150` to `20`
 * goes through `''` — so a default would snap the field back mid-edit.
 */
export interface NumberRangeConfig {
  readonly keys?: NumberRangeKeys
}

export function dateRange(config?: DateRangeConfig): DateRangeFilter {
  const keys = normalizeKeys('dateRange', config?.keys, ['from', 'to'])
  return keys === undefined ? { _kind: 'dateRange' } : { _kind: 'dateRange', keys }
}

export function numberRange(config?: NumberRangeConfig): NumberRangeFilter {
  const keys = normalizeKeys('numberRange', config?.keys, ['min', 'max'])
  return keys === undefined ? { _kind: 'numberRange' } : { _kind: 'numberRange', keys }
}

/**
 * Drops sides that were not given and rejects the ones that were given badly.
 *
 * Returning `undefined` for an all-empty override matters beyond tidiness: a
 * filter carrying `keys: {}` must be indistinguishable from one carrying no
 * `keys` at all, or `0.2.0` schemas stop deep-equalling their `0.3.0`
 * counterparts for no visible reason.
 */
function normalizeKeys<K extends string>(
  builder: 'dateRange' | 'numberRange',
  keys: Partial<Record<K, string>> | undefined,
  sides: readonly K[]
): Partial<Record<K, string>> | undefined {
  if (keys === undefined) return undefined

  const result: Partial<Record<K, string>> = {}
  let any = false

  for (const side of sides) {
    const value = keys[side]
    if (value === undefined) continue
    assertValidParamKeys(builder, side, value)
    result[side] = value
    any = true
  }

  return any ? result : undefined
}
