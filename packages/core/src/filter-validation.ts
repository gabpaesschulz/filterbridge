import type { MultiSelectFilter, SelectFilter } from './filter-types'

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
  if (typeof value === 'object' && value !== null) return Array.isArray(value) ? 'an array' : 'an object'
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
