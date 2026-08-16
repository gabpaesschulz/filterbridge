import type { FilterSchema, MultiSelectFilter, SelectFilter } from './filter-types'
import { filterParamKeys } from './param-keys'

/**
 * Bundlers replace the literal `process.env.NODE_ENV`, so the dev warning is
 * dead code in a production build. The declaration keeps the literal intact
 * without pulling @types/node into the package.
 */
declare const process: { env: { NODE_ENV?: string } }

/** Any filter whose value is constrained to a fixed option list. */
export type OptionFilter = SelectFilter<readonly string[]> | MultiSelectFilter<readonly string[]>

/**
 * The single membership rule for `select` and `multiSelect`, shared by
 * `parseFilters`, `toSearchParams` and `toQueryDto` so that a value the schema
 * rejects on the way in can never be produced on the way out.
 */
export function isValidOption(filter: OptionFilter, value: unknown): value is string {
  return includesOption(filter.options, value)
}

/** The membership rule itself, usable before a filter object exists. */
function includesOption(options: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && options.includes(value)
}

/** Keeps only the entries of `values` that the filter's options allow. */
export function validOptions(filter: OptionFilter, values: readonly unknown[]): string[] {
  return values.filter((value): value is string => isValidOption(filter, value))
}

/**
 * Checks a configured default against the same option list the parsers and
 * serializers use.
 *
 * Unlike `warnDroppedValue`, this throws. A default is static schema
 * configuration, not untrusted runtime state: a bad one is a source-level typo
 * that fails identically on every run, so failing loudly at schema definition
 * is strictly better than silently parsing to `undefined` later.
 */
export function assertValidDefaults(
  builder: 'select' | 'multiSelect',
  options: readonly string[],
  defaults: readonly unknown[]
): void {
  for (const value of defaults) {
    if (!includesOption(options, value)) {
      throw new Error(
        `[filterbridge] ${builder}(): default ${formatValue(value)} is not one of its ` +
          `options (${options.join(', ')}).`
      )
    }
  }
}

/**
 * Rejects a `keys` override that cannot address anything. Throws for the same
 * reason `assertValidDefaults` does: it is static configuration, so the failure
 * is a typo that fails identically on every run rather than untrusted input
 * arriving in a render path.
 */
export function assertValidParamKeys(
  builder: 'dateRange' | 'numberRange',
  side: string,
  key: unknown
): void {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error(
      `[filterbridge] ${builder}(): keys.${side} must be a non-empty string, got ` +
        `${formatValue(key)}.`
    )
  }

  // Padding is rejected rather than trimmed away. The point of `keys` is to
  // match the param name a backend expects, and ' created_after' round-trips
  // perfectly inside FilterBridge — parse and serialize agree on the same
  // string — while the URL carries `+created_after+` and the backend matches
  // nothing. Trimming silently would mean the schema does not say what it does;
  // throwing puts the typo in front of the person who can fix it.
  if (key !== key.trim()) {
    throw new Error(
      `[filterbridge] ${builder}(): keys.${side} must not have leading or trailing ` +
        `whitespace, got ${formatValue(key)}.`
    )
  }
}

/**
 * Rejects a schema in which two filters resolve to the same URL param key.
 *
 * This is possible without any custom key — `{ createdAtFrom: text(), createdAt:
 * dateRange() }` collides today, and `toSearchParams` silently lets the last
 * writer win, so one of the two filters round-trips to a value it never held.
 * A custom key makes the collision much easier to reach, which is why the check
 * arrives with the feature.
 *
 * It throws rather than warns for the `assertValidDefaults` reason: a schema is
 * evaluated once at module load, and two filters fighting over one param was
 * never a working configuration.
 */
export function assertUniqueParamKeys(schema: FilterSchema): void {
  const owners = new Map<string, string>()

  for (const [name, filter] of Object.entries(schema)) {
    for (const key of filterParamKeys(name, filter)) {
      const owner = owners.get(key)

      // A filter colliding with itself is a different mistake, and only a range
      // can reach it: both of its sides resolved to one key. The generic
      // sentence named the same filter twice and told the caller to rename one
      // of them or add the `keys` override they had just written.
      if (owner === name) {
        const sides =
          filter._kind === 'numberRange' ? 'keys.min and keys.max' : 'keys.from and keys.to'
        throw new Error(
          `[filterbridge] defineFilters(): filter ${JSON.stringify(name)} uses the URL param ` +
            `${JSON.stringify(key)} for both sides of its range. Give ${sides} different names.`
        )
      }

      if (owner !== undefined) {
        throw new Error(
          `[filterbridge] defineFilters(): filters ${JSON.stringify(owner)} and ` +
            `${JSON.stringify(name)} both use the URL param ${JSON.stringify(key)}. ` +
            `Rename one, or give it an explicit keys override.`
        )
      }
      owners.set(key, name)
    }
  }
}

function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    // `process` is undefined in an unbundled browser environment.
    return false
  }
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'object' && value !== null)
    return Array.isArray(value) ? 'an array' : 'an object'
  return String(value)
}

/**
 * Dev-only notice that a serializer dropped a value the schema forbids.
 * Never throws: serializers run inside React render paths, so a bad value must
 * degrade to a missing key, not to a blank screen.
 */
export function warnDroppedValue(
  source: string,
  key: string,
  filter: OptionFilter,
  value: unknown
): void {
  if (!isDevelopment()) return
  // eslint-disable-next-line no-console
  console.warn(
    `[filterbridge] ${source}: dropped ${formatValue(value)} for filter "${key}" ` +
      `because it is not one of its options (${filter.options.join(', ')}).`
  )
}
