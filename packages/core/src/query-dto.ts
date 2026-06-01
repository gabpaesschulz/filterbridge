import type { AnyFilter } from './filter-types'
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
      case 'text':
        if (typeof value === 'string' && value) {
          dto[key] = value
        }
        break

      case 'select':
        dto[key] = value
        break

      case 'multiSelect':
        if (Array.isArray(value) && value.length > 0) {
          dto[key] = value
        }
        break

      case 'boolean':
        dto[key] = value
        break

      case 'dateRange': {
        const range = value as { from?: string; to?: string }
        if (range.from || range.to) {
          dto[key] = range
        }
        break
      }

      case 'numberRange': {
        const range = value as { min?: number; max?: number }
        if (range.min !== undefined || range.max !== undefined) {
          dto[key] = range
        }
        break
      }
    }
  }

  return dto as InferFilterState<S>
}
