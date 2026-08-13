import { useCallback, useMemo, useRef, useState } from 'react'
import {
  getDefaultFilterState,
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

  // Hook state is always kept inside the range of parseFilters: every write is
  // layered over the schema defaults, so there is always some URL that parses
  // to it. Without this, `{}` is reachable through reset/clear/syncState but is
  // not a state any query string can express — the UI would show a filter as
  // cleared while the URL and the DTO both read it as its default.
  //
  // getDefaultFilterState returns {} for a schema without defaults, so this is
  // the identity there and nothing changes.
  const defaults = useMemo(
    () => getDefaultFilterState(schema) as Record<string, unknown>,
    [schema]
  )

  const withDefaults = useCallback(
    (next: Record<string, unknown>) => ({ ...defaults, ...next }) as State,
    [defaults]
  )

  const [state, setState] = useState<State>(() => {
    const initial = (options?.initialState ?? {}) as Record<string, unknown>
    return { ...getDefaultFilterState(schema), ...cleanFilterState(initial) } as State
  })

  // The cleaned initialState, captured once. useRef only uses its argument on
  // the first render, so this holds the mount value and deliberately ignores
  // later changes to options.initialState — the hook stays uncontrolled, and
  // resetToInitial() always means "back to how this component was mounted".
  const initialStateRef = useRef(state)

  // Central updater: applies a pure transformation, cleans empty values,
  // and notifies the caller. Calling onChange inside the setState callback
  // means it fires synchronously during each action (not via useEffect),
  // which avoids the Strict Mode double-fire that effects would cause.
  const updateState = useCallback((updater: (current: State) => State) => {
    setState((current) => {
      const next = withDefaults(cleanFilterState(updater(current) as Record<string, unknown>))
      onChangeRef.current?.(next)
      return next
    })
  }, [withDefaults])

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

  // Goes through updateState like every other mutator, so the restored state is
  // cleaned and onChange fires. cleanFilterState copies, so the captured
  // initialState object is never handed out or mutated.
  const resetToInitial = useCallback(() => {
    updateState(() => initialStateRef.current)
  }, [updateState])

  // Escape hatch for state that originates outside the component — a popstate
  // handler, a websocket push, a parent that owns the URL. It deliberately
  // bypasses updateState so onChange does NOT fire: the usual caller writes
  // onChange back to the URL, and firing it here would turn "the URL changed,
  // adopt it" into "adopt it, then write it back", which loops.
  const syncState = useCallback(
    (next: Partial<State>) => {
      setState(withDefaults(cleanFilterState((next ?? {}) as Record<string, unknown>)))
    },
    [withDefaults]
  )

  const activeFilterCount = useMemo(
    () => countActiveFilters(schema, state as Record<string, unknown>),
    [schema, state]
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
    resetToInitial,
    syncState,
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
    toQueryDto,
    toSearchParams,
  }
}
