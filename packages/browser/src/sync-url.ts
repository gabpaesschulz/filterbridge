import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import { createFilterUrl } from './create-filter-url'
import type { SyncUrlOptions } from './types'

function getHistory(options?: SyncUrlOptions): Pick<History, 'replaceState' | 'pushState'> | null {
  if (options?.history) return options.history
  if (typeof window !== 'undefined' && window.history) return window.history
  return null
}

function resolveCurrentSearch(options?: SyncUrlOptions): string | undefined {
  if (options?.currentSearch !== undefined) return options.currentSearch as string
  if (typeof window !== 'undefined') return window.location.search
  return undefined
}

function resolveHistoryState(options?: SyncUrlOptions): unknown {
  if (options?.state !== undefined) return options.state
  if (typeof window !== 'undefined') return window.history.state
  return null
}

export function replaceUrlFilters<S extends FilterSchema>(
  schema: S,
  state: InferFilterState<S>,
  options?: SyncUrlOptions
): void {
  const history = getHistory(options)
  if (!history) return

  const url = createFilterUrl(schema, state, {
    ...options,
    currentSearch: resolveCurrentSearch(options),
  })

  history.replaceState(resolveHistoryState(options), options?.title ?? '', url)
}

export function pushUrlFilters<S extends FilterSchema>(
  schema: S,
  state: InferFilterState<S>,
  options?: SyncUrlOptions
): void {
  const history = getHistory(options)
  if (!history) return

  const url = createFilterUrl(schema, state, {
    ...options,
    currentSearch: resolveCurrentSearch(options),
  })

  history.pushState(resolveHistoryState(options), options?.title ?? '', url)
}
