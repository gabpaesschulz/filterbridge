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
 * The URL param a filter reads and writes, when it should not be the filter's
 * name — `text({ key: 'q' })` serializes to `?q=`.
 *
 * Accepted by every builder that occupies a single param. The range builders
 * take `keys` instead, because they occupy two.
 */
export interface ParamKeyConfig {
  readonly key?: string
}

/**
 * Configuration accepted as the last argument of `select`, `multiSelect` and
 * `boolean`.
 *
 * `default` is the value `parseFilters` uses when the key is absent from the
 * input or present but invalid. It is also the value `toSearchParams` omits, so
 * a filter sitting at its default produces no query param at all.
 *
 * `text`, `dateRange` and `numberRange` deliberately do not accept a `default` —
 * see the note on each, and `docs/decisions/002-default-values.md`. `text` takes
 * {@link TextConfig}, which is this type without it.
 */
export interface FilterConfig<TValue> extends ParamKeyConfig {
  readonly default?: TValue
}

/**
 * Configuration for `text`: a param key override and nothing else.
 *
 * Deliberately not `FilterConfig<string>`. Under the hook's defaults rule,
 * clearing a filter returns it to its default — coherent for a discrete choice
 * and hostile for free text, since deleting is continuous editing and the input
 * would repopulate itself while the user is still backspacing through it. That
 * restriction is a type error at the call site, and it stays one.
 */
export interface TextConfig extends ParamKeyConfig {
  readonly default?: never
}

export function text(config?: TextConfig): TextFilter {
  const key = normalizeKey('text', config)
  return key === undefined ? { _kind: 'text' } : { _kind: 'text', key }
}

export function select<const T extends readonly string[]>(
  options: T,
  config?: FilterConfig<T[number]>
): SelectFilter<T> {
  const key = normalizeKey('select', config)
  if (config?.default === undefined) return { _kind: 'select', options, ...(key && { key }) }
  assertValidDefaults('select', options, [config.default])
  return { _kind: 'select', options, default: config.default, ...(key && { key }) }
}

export function multiSelect<const T extends readonly string[]>(
  options: T,
  config?: FilterConfig<ReadonlyArray<T[number]>>
): MultiSelectFilter<T> {
  const key = normalizeKey('multiSelect', config)
  const values = config?.default
  // An empty default selects nothing, which is what no default already means.
  if (values === undefined || values.length === 0) {
    return { _kind: 'multiSelect', options, ...(key && { key }) }
  }
  assertValidDefaults('multiSelect', options, values)
  return { _kind: 'multiSelect', options, default: [...values], ...(key && { key }) }
}

export function boolean(config?: FilterConfig<boolean>): BooleanFilter {
  const key = normalizeKey('boolean', config)
  return typeof config?.default === 'boolean'
    ? { _kind: 'boolean', default: config.default, ...(key && { key }) }
    : { _kind: 'boolean', ...(key && { key }) }
}

/**
 * Validates a scalar `key` override and drops it when absent.
 *
 * Returning `undefined` for `{ key: undefined }` matters for the same reason
 * `normalizeKeys` returns it for an all-empty `keys`: a filter built with an
 * explicitly-undefined key must deep-equal one built without the option at all,
 * or schemas stop comparing equal across versions for no visible reason.
 */
function normalizeKey(
  builder: 'text' | 'select' | 'multiSelect' | 'boolean',
  config: ParamKeyConfig | undefined
): string | undefined {
  if (config === undefined || config.key === undefined) return undefined
  assertValidParamKeys(builder, 'key', config.key)
  return config.key
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

  // A side this builder does not have was the one malformed `keys` that used to
  // pass in silence: `{ form: 'created_after' }` iterated over `sides`, matched
  // nothing, and returned a filter still reading `createdAtFrom`. The typo then
  // surfaced as an empty filter on a URL that looked right. Rejected for the
  // same reason as every other check here — it is static configuration, so it
  // fails identically on every run.
  //
  // TypeScript rejects it in an object literal, but not behind a cast, not
  // through a variable typed more loosely, and not for a JavaScript caller.
  assertKnownSides(builder, keys, sides)

  const result: Partial<Record<K, string>> = {}
  let any = false

  for (const side of sides) {
    const value = keys[side]
    if (value === undefined) continue
    assertValidParamKeys(builder, `keys.${side}`, value)
    result[side] = value
    any = true
  }

  return any ? result : undefined
}

function assertKnownSides<K extends string>(
  builder: 'dateRange' | 'numberRange',
  keys: Partial<Record<K, string>>,
  sides: readonly K[]
): void {
  for (const side of Object.keys(keys)) {
    if (!(sides as readonly string[]).includes(side)) {
      throw new Error(
        `[filterbridge] ${builder}(): keys has no side ${JSON.stringify(side)}. ` +
          `Expected ${sides.join(', ')}.`
      )
    }
  }
}
