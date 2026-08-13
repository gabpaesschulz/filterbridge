import { isAtDefault } from '@filterbridge/core'
import type { FilterSchema } from '@filterbridge/core'

/**
 * How many filters the user has moved away from the page's baseline.
 *
 * Without schema defaults the baseline is the empty state, so this is just the
 * number of keys — `cleanFilterState` has already removed the empty ones.
 *
 * With defaults the baseline shifts: a filter sitting at its default is what
 * the page looks like before anyone touches anything, and it emits no query
 * param. Counting it would open every virgin page reading "3 active filters"
 * with the Reset button enabled, which answers a question nobody asked. The
 * comparison is `isAtDefault` rather than a local reimplementation so that
 * "active" and "appears in the URL" cannot drift apart.
 */
export function countActiveFilters(
  schema: FilterSchema,
  state: Record<string, unknown>
): number {
  let count = 0

  for (const key of Object.keys(state)) {
    const filter = schema[key]
    // A key the schema does not own is not a filter, but it was counted before
    // defaults existed and nothing in the hook can produce one, so it is left
    // alone rather than silently changing an unrelated behavior.
    if (filter !== undefined && isAtDefault(filter, state[key])) continue
    count += 1
  }

  return count
}
