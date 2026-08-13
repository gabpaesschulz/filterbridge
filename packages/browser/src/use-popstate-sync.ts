import { useEffect, useRef } from 'react'
import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import { parseFiltersFromUrl } from './parse-filters-from-url'
import type { UsePopstateSyncOptions } from './types'

/**
 * Re-reads filter state from the URL whenever the user navigates with the
 * browser's back/forward buttons, and hands it to `onState`.
 *
 * Pair it with `useFilterBridge().syncState`, which applies state without
 * firing `onChange` — otherwise the write-back that put the filters in the URL
 * would run again on every popstate.
 *
 * Does nothing when `window` is undefined, so it is safe to render on a server.
 */
export function usePopstateSync<S extends FilterSchema>(
  schema: S,
  onState: (state: InferFilterState<S>) => void,
  options?: UsePopstateSyncOptions
): void {
  // Both are read only inside the event handler, so keeping them in refs lets
  // the subscription survive inline schemas and inline callbacks without
  // re-subscribing on every render.
  const schemaRef = useRef(schema)
  schemaRef.current = schema

  const onStateRef = useRef(onState)
  onStateRef.current = onState

  const enabled = options?.enabled ?? true

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const handlePopstate = () => {
      onStateRef.current(parseFiltersFromUrl(schemaRef.current))
    }

    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [enabled])
}
