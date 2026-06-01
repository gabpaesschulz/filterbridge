import { toSearchParams as coreToSearchParams } from '@filterbridge/core'
import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import { getFilterParamKeys } from './filter-param-keys'
import type { CreateFilterUrlOptions } from './types'

function parseCurrentSearch(search: string | URLSearchParams): URLSearchParams {
  if (search instanceof URLSearchParams) return search
  const s = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(s)
}

function getPathname(options?: CreateFilterUrlOptions): string {
  if (options?.pathname !== undefined) return options.pathname
  if (typeof window !== 'undefined') return window.location.pathname
  return '/'
}

export function createFilterUrl<S extends FilterSchema>(
  schema: S,
  state: InferFilterState<S>,
  options?: CreateFilterUrlOptions
): string {
  const pathname = getPathname(options)
  const hash = options?.hash ?? ''
  const preserveExisting = options?.preserveExistingParams !== false

  const filterKeys = new Set(getFilterParamKeys(schema))
  const result = new URLSearchParams()

  if (preserveExisting && options?.currentSearch !== undefined) {
    const existing = parseCurrentSearch(options.currentSearch)
    existing.forEach((value, key) => {
      if (!filterKeys.has(key)) {
        result.set(key, value)
      }
    })
  }

  const filterParams = coreToSearchParams(schema, state)
  filterParams.forEach((value, key) => {
    result.set(key, value)
  })

  const search = result.toString()
  return pathname + (search ? `?${search}` : '') + (hash ? `#${hash}` : '')
}
