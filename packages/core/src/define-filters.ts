import type { AnyFilter } from './filter-types'
import { assertUniqueParamKeys } from './filter-validation'

/**
 * Declares a filter schema.
 *
 * The identity function it looks like, plus one check: no two filters may
 * resolve to the same URL param key. `parseFilters` and `toSearchParams` accept
 * a plain object too, so this is the opt-in place where a schema is verified —
 * which is the argument for calling it rather than writing the literal inline.
 */
export function defineFilters<S extends Record<string, AnyFilter>>(schema: S): S {
  assertUniqueParamKeys(schema)
  return schema
}
