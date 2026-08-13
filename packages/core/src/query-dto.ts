import { isAtDefault } from './defaults'
import type { AnyFilter, DateRangeValue, NumberRangeValue } from './filter-types'
import { isValidOption, validOptions, warnDroppedValue } from './filter-validation'
import type { InferFilterState } from './infer'

export function toQueryDto<S extends Record<string, AnyFilter>>(
  schema: S,
  state: InferFilterState<S>
): InferFilterState<S> {
  const dto: Record<string, unknown> = {}
  const raw = state as Record<string, unknown>

  for (const [key, filter] of Object.entries(schema)) {
    const value = raw[key]
    if (value === undefined || value === null) continue

    switch (filter._kind) {
      case 'text': {
        // Trimmed on the way out, exactly as parseFilters trims on the way in,
        // so a whitespace-only field never reaches the backend as a value.
        const trimmed = typeof value === 'string' ? value.trim() : ''
        if (trimmed && !isAtDefault(filter, trimmed)) {
          dto[key] = trimmed
        }
        break
      }

      case 'select':
        if (isValidOption(filter, value)) {
          if (!isAtDefault(filter, value)) {
            dto[key] = value
          }
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
        if (valid.length > 0 && !isAtDefault(filter, valid)) {
          dto[key] = valid
        }
        break
      }

      case 'boolean':
        // Type-checked exactly as toSearchParams checks it. Without this a
        // `'true'` string arriving from JSON or a cast is dropped from the URL
        // and kept in the DTO, so the two outputs disagree about the same state.
        if (typeof value === 'boolean' && !isAtDefault(filter, value)) {
          dto[key] = value
        }
        break

      case 'dateRange': {
        // Rebuilt side by side rather than passed through, so an empty side is
        // dropped instead of reaching the backend as `''`.
        const range = value as DateRangeValue
        const next: DateRangeValue = {}
        if (typeof range.from === 'string' && range.from.trim()) next.from = range.from.trim()
        if (typeof range.to === 'string' && range.to.trim()) next.to = range.to.trim()
        if ((next.from !== undefined || next.to !== undefined) && !isAtDefault(filter, next)) {
          dto[key] = next
        }
        break
      }

      case 'numberRange': {
        const range = value as NumberRangeValue
        const next: NumberRangeValue = {}
        if (Number.isFinite(range.min)) next.min = range.min
        if (Number.isFinite(range.max)) next.max = range.max
        if ((next.min !== undefined || next.max !== undefined) && !isAtDefault(filter, next)) {
          dto[key] = next
        }
        break
      }
    }
  }

  return dto as InferFilterState<S>
}
