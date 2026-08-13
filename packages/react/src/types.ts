import type { FilterSchema, InferFilterState } from '@filterbridge/core'

export type UseFilterBridgeOptions<TSchema extends FilterSchema> = {
  initialState?: Partial<InferFilterState<TSchema>>
  onChange?: (state: InferFilterState<TSchema>) => void
}

export type UseFilterBridgeReturn<TSchema extends FilterSchema> = {
  state: InferFilterState<TSchema>

  set: <TKey extends keyof InferFilterState<TSchema>>(
    key: TKey,
    value: InferFilterState<TSchema>[TKey]
  ) => void

  setMany: (values: Partial<InferFilterState<TSchema>>) => void

  clear: <TKey extends keyof InferFilterState<TSchema>>(key: TKey) => void

  /**
   * Clears every filter. State becomes `{}`.
   *
   * This is "clear everything", not "back to `initialState`" — use
   * {@link UseFilterBridgeReturn.resetToInitial} for the latter.
   */
  reset: () => void

  /**
   * Restores the `initialState` passed at mount, cleaned the same way every
   * other state write is.
   *
   * Later changes to `options.initialState` are ignored: the value is captured
   * once on the first render, so the hook stays uncontrolled. Fires `onChange`.
   */
  resetToInitial: () => void

  /**
   * Replaces the whole state with externally-provided state.
   *
   * Unlike `set` / `setMany` / `clear` / `reset`, this does **not** fire
   * `onChange`. Use it for state that already came from outside the hook
   * (browser history, a router, a server push) so a write-back in `onChange`
   * cannot loop.
   */
  syncState: (state: Partial<InferFilterState<TSchema>>) => void

  hasActiveFilters: boolean
  activeFilterCount: number

  toQueryDto: () => InferFilterState<TSchema>
  toSearchParams: () => URLSearchParams
}
