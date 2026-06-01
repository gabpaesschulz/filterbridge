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

  reset: () => void

  hasActiveFilters: boolean
  activeFilterCount: number

  toQueryDto: () => InferFilterState<TSchema>
  toSearchParams: () => URLSearchParams
}
