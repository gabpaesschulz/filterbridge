import type {
  AnyFilter,
  BooleanFilter,
  DateRangeFilter,
  FilterSchema,
  MultiSelectFilter,
  NumberRangeFilter,
  SelectFilter,
  TextFilter,
} from './filter-types'

/** A filter occupying a single URL param: everything that is not a range. */
type ScalarFilter =
  | TextFilter
  | SelectFilter<readonly string[]>
  | MultiSelectFilter<readonly string[]>
  | BooleanFilter

/**
 * The one place in the repository that knows how a filter name becomes a URL
 * param key.
 *
 * It used to be four places: `parseFilters`, `toSearchParams`,
 * `@filterbridge/browser`'s `getFilterParamKeys` and `@filterbridge/next`'s
 * normalization each spelled out `From` / `To` / `Min` / `Max` independently.
 * That is the same duplicated-knowledge shape that let `core` and `next`
 * disagree about repeated query params in `0.1.0` — one URL, two states, silent
 * data loss. Adding a per-filter `keys` override to four copies would have made
 * it worse, so the override and the collapse landed together.
 *
 * Everything downstream reads keys from here. Nothing else concatenates a
 * suffix onto a filter name.
 */

/**
 * The single param key a `text`, `select`, `multiSelect` or `boolean` occupies,
 * after any `key` override.
 */
export function scalarParamKey(name: string, filter: ScalarFilter): string {
  return filter.key ?? name
}

/** The two param keys a `dateRange` occupies, after any `keys` override. */
export function dateRangeParamKeys(
  name: string,
  filter: DateRangeFilter
): { from: string; to: string } {
  return {
    from: filter.keys?.from ?? `${name}From`,
    to: filter.keys?.to ?? `${name}To`,
  }
}

/** The two param keys a `numberRange` occupies, after any `keys` override. */
export function numberRangeParamKeys(
  name: string,
  filter: NumberRangeFilter
): { min: string; max: string } {
  return {
    min: filter.keys?.min ?? `${name}Min`,
    max: filter.keys?.max ?? `${name}Max`,
  }
}

/**
 * Every param key one filter reads and writes.
 *
 * Scalar filters occupy their own name. Ranges occupy two keys, in from/to and
 * min/max order — stable, because `getFilterParamKeys` feeds URL cleanup and a
 * reordered list would churn diffs for no reason.
 */
export function filterParamKeys(name: string, filter: AnyFilter): string[] {
  switch (filter._kind) {
    case 'dateRange': {
      const keys = dateRangeParamKeys(name, filter)
      return [keys.from, keys.to]
    }
    case 'numberRange': {
      const keys = numberRangeParamKeys(name, filter)
      return [keys.min, keys.max]
    }
    // Enumerated rather than left to a `default`, which is the whole point of
    // this module. A `default: return [name]` answers a kind it has never seen
    // with a guess, and the guess is wrong for exactly the shape most likely to
    // be added next: a filter occupying two params. `getFilterParamKeys` is
    // what `createFilterUrl` strips before writing the new state, so a key it
    // failed to report would sit in the URL forever.
    case 'text':
    case 'select':
    case 'multiSelect':
    case 'boolean':
      return [scalarParamKey(name, filter)]
  }

  // Unreachable through the type system — `filter` is `never` here, so adding a
  // kind without adding it above fails to compile. The runtime half covers a
  // schema built by hand or arriving across a JSON boundary: a wrong key is
  // silent data loss, and static configuration is the one place this package
  // already chooses to throw (see `filter-validation.ts`).
  const unsupported: never = filter
  throw new Error(
    `[filterbridge] filterParamKeys(): unsupported filter kind ` +
      `${JSON.stringify((unsupported as AnyFilter)._kind)} for filter ${JSON.stringify(name)}.`
  )
}

/**
 * Every param key a schema occupies, in declaration order.
 *
 * `@filterbridge/browser` re-exports this unchanged: it is what
 * `createFilterUrl` strips before writing the new state, so a custom key that
 * this function did not report would linger in the URL forever.
 */
export function getFilterParamKeys(schema: FilterSchema): string[] {
  const keys: string[] = []
  for (const [name, filter] of Object.entries(schema)) {
    keys.push(...filterParamKeys(name, filter))
  }
  return keys
}
