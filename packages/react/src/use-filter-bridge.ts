import { useCallback, useMemo, useRef, useState } from 'react'
import {
  toQueryDto as coreToQueryDto,
  toSearchParams as coreToSearchParams,
} from '@filterbridge/core'
import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import { countActiveFilters } from './active-filters'
import { cleanFilterState } from './clean-state'
import type { UseFilterBridgeOptions, UseFilterBridgeReturn } from './types'

export function useFilterBridge<TSchema extends FilterSchema>(
  schema: TSchema,
  options?: UseFilterBridgeOptions<TSchema>
): UseFilterBridgeReturn<TSchema> {
  type State = InferFilterState<TSchema>

  // Keep latest onChange in a ref to avoid stale closures without
  // needing onChange in dependency arrays.
  const onChangeRef = useRef(options?.onChange)
  onChangeRef.current = options?.onChange

  const [state, setState] = useState<State>(() => {
    const initial = (options?.initialState ?? {}) as Record<string, unknown>
    return cleanFilterState(initial) as State
  })

  // Central updater: applies a pure transformation, cleans empty values,
  // and notifies the caller. Calling onChange inside the setState callback
  // means it fires synchronously during each action (not via useEffect),
  // which avoids the Strict Mode double-fire that effects would cause.
  const updateState = useCallback((updater: (current: State) => State) => {
    setState((current) => {
      const next = cleanFilterState(updater(current) as Record<string, unknown>) as State
      onChangeRef.current?.(next)
      return next
    })
  }, [])

  const set = useCallback(
    <TKey extends keyof State>(key: TKey, value: State[TKey]) => {
      updateState((current) => ({ ...current, [key]: value }))
    },
    [updateState]
  )

  const setMany = useCallback(
    (values: Partial<State>) => {
      updateState((current) => ({ ...current, ...values }))
    },
    [updateState]
  )

  const clear = useCallback(
    <TKey extends keyof State>(key: TKey) => {
      updateState((current) => {
        const next = { ...current } as State
        delete next[key]
        return next
      })
    },
    [updateState]
  )

  const reset = useCallback(() => {
    updateState(() => ({} as State))
  }, [updateState])

  const activeFilterCount = useMemo(
    () => countActiveFilters(state as Record<string, unknown>),
    [state]
  )

  const toQueryDto = useCallback(
    () => coreToQueryDto(schema, state),
    [schema, state]
  )

  const toSearchParams = useCallback(
    () => coreToSearchParams(schema, state),
    [schema, state]
  )

  return {
    state,
    set,
    setMany,
    clear,
    reset,
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
    toQueryDto,
    toSearchParams,
  }
}
