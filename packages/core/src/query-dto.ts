import { filterDefault } from './defaults'
import type { AnyFilter, DateRangeValue, NumberRangeValue } from './filter-types'
import { isValidOption, validOptions, warnDroppedValue } from './filter-validation'
import type { InferFilterState } from './infer'

/**
 * Converts filter state into a backend-friendly DTO.
 *
 * Unlike `toSearchParams`, this does **not** omit a value equal to its default.
 * Omitting it from the URL is compression with a guaranteed decompressor —
 * `parseFilters` puts the default back on the way in. The DTO has no such
 * closure: it leaves the system for a backend that does not run FilterBridge
 * and cannot know the schema, so omitting a default there is loss, not
 * compression. A page sitting at `status: 'paid'` would otherwise render
 * "paid" while the backend, handed `{}`, returned everything.
 *
 * The fallback rule is therefore the same one `parseFilters` applies: a value
 * that is absent, empty or invalid becomes the filter's default. That is what
 * keeps `toQueryDto(state)` equal to `toQueryDto(parseFilters(schema,
 * toSearchParams(schema, state)))` for every state.
 */
export function toQueryDto<S extends Record<string, AnyFilter>>(
  schema: S,
  state: InferFilterState<S>
): InferFilterState<S> {
  const dto: Record<string, unknown> = {}
  const raw = state as Record<string, unknown>

  for (const [key, filter] of Object.entries(schema)) {
    const value = raw[key]
    let next: unknown

    if (value !== undefined && value !== null) {
      switch (filter._kind) {
        case 'text': {
          // Trimmed on the way out, exactly as parseFilters trims on the way
          // in, so a whitespace-only field never reaches the backend.
          const trimmed = typeof value === 'string' ? value.trim() : ''
          if (trimmed) next = trimmed
          break
        }

        case 'select':
          if (isValidOption(filter, value)) {
            next = value
          } else {
            warnDroppedValue('toQueryDto', key, filter, value)
          }
          break

        case 'multiSelect': {
          if (!Array.isArray(value)) break
          const valid = validOptions(filter, value)
          for (const entry of value) {
            if (!isValidOption(filter, entry)) {
              warnDroppedValue('toQueryDto', key, filter, entry)
            }
          }
          if (valid.length > 0) next = valid
          break
        }

        case 'boolean':
          // Type-checked exactly as toSearchParams checks it. Without this a
          // `'true'` string arriving from JSON or a cast is dropped from the
          // URL and kept in the DTO, so the two outputs disagree.
          if (typeof value === 'boolean') next = value
          break

        case 'dateRange': {
          // Rebuilt side by side rather than passed through, so an empty side
          // is dropped instead of reaching the backend as `''`.
          const range = value as DateRangeValue
          const rebuilt: DateRangeValue = {}
          if (typeof range.from === 'string' && range.from.trim()) rebuilt.from = range.from.trim()
          if (typeof range.to === 'string' && range.to.trim()) rebuilt.to = range.to.trim()
          if (rebuilt.from !== undefined || rebuilt.to !== undefined) next = rebuilt
          break
        }

        case 'numberRange': {
          const range = value as NumberRangeValue
          const rebuilt: NumberRangeValue = {}
          if (Number.isFinite(range.min)) rebuilt.min = range.min
          if (Number.isFinite(range.max)) rebuilt.max = range.max
          if (rebuilt.min !== undefined || rebuilt.max !== undefined) next = rebuilt
          break
        }
      }
    }

    // Same fallback parseFilters uses: every branch above yields undefined for
    // a missing *and* for an invalid value, so one check covers both.
    if (next === undefined) next = filterDefault(filter)
    if (next !== undefined) dto[key] = next
  }

  return dto as InferFilterState<S>
}
