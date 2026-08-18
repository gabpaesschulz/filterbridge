import { type FilterSchema, dateRangeParamKeys, numberRangeParamKeys } from '@filterbridge/core'
import type { NextSearchParamsInput } from './types'

type RawRecord = Record<string, string | string[] | undefined>

/**
 * Converts any NextSearchParamsInput variant into a flat Record<string, string | string[] | undefined>.
 * Handles plain records, URLSearchParams, and duck-typed ReadonlyURLSearchParams-like objects.
 */
export function inputToRawRecord(input: NextSearchParamsInput): RawRecord {
  if (input == null) return {}

  const asAny = input as Record<string, unknown>

  // URLSearchParams-like: has getAll + forEach — real URLSearchParams or compatible duck type
  if (typeof asAny['getAll'] === 'function' && typeof asAny['forEach'] === 'function') {
    const result: RawRecord = {}
    const seen = new Set<string>()
    ;(asAny['forEach'] as (fn: (v: string, k: string) => void) => void)((_, key) => {
      if (seen.has(key)) return
      seen.add(key)
      const all = (asAny['getAll'] as (k: string) => string[])(key)
      result[key] = all.length > 1 ? all : all[0]
    })
    return result
  }

  // Duck-typed ReadonlyURLSearchParams with entries() but no forEach
  if (typeof asAny['entries'] === 'function') {
    const accumulated: Record<string, string[]> = {}
    for (const [key, value] of (asAny['entries'] as () => IterableIterator<[string, string]>)()) {
      if (!accumulated[key]) accumulated[key] = []
      accumulated[key].push(value)
    }
    return Object.fromEntries(
      Object.entries(accumulated).map(([k, v]) => [k, v.length === 1 ? v[0] : v])
    )
  }

  // Plain record — most common case: Next.js server component searchParams prop
  return input as RawRecord
}

/**
 * Converts a Next.js App Router searchParams value into a plain Record<string, unknown>
 * suitable for passing to parseFilters(). The conversion is schema-aware:
 *
 * - For text, select, boolean: string[] input picks the first element
 * - For multiSelect: string[] input is preserved as-is
 * - For dateRange and numberRange: reads whichever param keys core derives for
 *   the filter — `<name>From` / `<name>To` and `<name>Min` / `<name>Max` by
 *   default, or the filter's `keys` override
 * - Params outside the schema are ignored
 */
export function normalizeNextSearchParams<S extends FilterSchema>(
  schema: S,
  searchParams?: NextSearchParamsInput
): Record<string, unknown> {
  if (!searchParams) return {}

  const raw = inputToRawRecord(searchParams)
  const result: Record<string, unknown> = {}

  for (const [key, filter] of Object.entries(schema)) {
    switch (filter._kind) {
      case 'text':
      case 'select':
      case 'boolean': {
        const val = raw[key]
        if (val === undefined) break
        // If Next provided string[] for a scalar field, take the first value
        result[key] = Array.isArray(val) ? val[0] : val
        break
      }

      case 'multiSelect': {
        const val = raw[key]
        if (val !== undefined) {
          result[key] = val
        }
        break
      }

      // Both range branches read their param names from core rather than
      // rebuilding them. This package spelling out its own `From`/`To` is how
      // it drifted from core over repeated query params in 0.1.0.
      case 'dateRange': {
        const keys = dateRangeParamKeys(key, filter)
        const fromVal = raw[keys.from]
        const toVal = raw[keys.to]
        if (fromVal !== undefined) {
          result[keys.from] = Array.isArray(fromVal) ? fromVal[0] : fromVal
        }
        if (toVal !== undefined) {
          result[keys.to] = Array.isArray(toVal) ? toVal[0] : toVal
        }
        break
      }

      case 'numberRange': {
        const keys = numberRangeParamKeys(key, filter)
        const minVal = raw[keys.min]
        const maxVal = raw[keys.max]
        if (minVal !== undefined) {
          result[keys.min] = Array.isArray(minVal) ? minVal[0] : minVal
        }
        if (maxVal !== undefined) {
          result[keys.max] = Array.isArray(maxVal) ? maxVal[0] : maxVal
        }
        break
      }
    }
  }

  return result
}
