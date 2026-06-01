import type { AnyFilter } from './filter-types'
import type { InferFilterState } from './infer'

export function toSearchParams<S extends Record<string, AnyFilter>>(
  schema: S,
  state: InferFilterState<S>
): URLSearchParams {
  const params = new URLSearchParams()
  const raw = state as Record<string, unknown>

  for (const [key, filter] of Object.entries(schema)) {
    const value = raw[key]
    if (value === undefined || value === null) continue

    switch (filter._kind) {
      case 'text':
        if (typeof value === 'string' && value) {
          params.set(key, value)
        }
        break

      case 'select':
        if (typeof value === 'string') {
          params.set(key, value)
        }
        break

      case 'multiSelect':
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, (value as string[]).join(','))
        }
        break

      case 'boolean':
        if (typeof value === 'boolean') {
          params.set(key, String(value))
        }
        break

      case 'dateRange': {
        const range = value as { from?: string; to?: string }
        if (range.from) params.set(`${key}From`, range.from)
        if (range.to) params.set(`${key}To`, range.to)
        break
      }

      case 'numberRange': {
        const range = value as { min?: number; max?: number }
        if (range.min !== undefined) params.set(`${key}Min`, String(range.min))
        if (range.max !== undefined) params.set(`${key}Max`, String(range.max))
        break
      }
    }
  }

  return params
}
