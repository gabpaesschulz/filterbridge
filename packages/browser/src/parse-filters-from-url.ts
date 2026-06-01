import { parseFilters } from '@filterbridge/core'
import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import type { UrlLike } from './types'

function resolveSearchParams(input: UrlLike): URLSearchParams {
  if (input instanceof URLSearchParams) return input
  if (input instanceof URL) return input.searchParams
  if (typeof input === 'string') {
    const search = input.startsWith('?') ? input.slice(1) : input
    return new URLSearchParams(search)
  }
  // location-like: { search: string }
  const search = input.search.startsWith('?') ? input.search.slice(1) : input.search
  return new URLSearchParams(search)
}

export function parseFiltersFromUrl<S extends FilterSchema>(
  schema: S,
  input?: UrlLike
): InferFilterState<S> {
  try {
    if (input === undefined) {
      if (typeof window === 'undefined') return {} as InferFilterState<S>
      return parseFilters(schema, new URLSearchParams(window.location.search))
    }
    return parseFilters(schema, resolveSearchParams(input))
  } catch {
    return {} as InferFilterState<S>
  }
}
