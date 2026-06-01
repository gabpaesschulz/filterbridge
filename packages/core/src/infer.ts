import type {
  AnyFilter,
  BooleanFilter,
  DateRangeFilter,
  MultiSelectFilter,
  NumberRangeFilter,
  SelectFilter,
  TextFilter,
} from './filter-types'

export type FilterStateValue<F extends AnyFilter> = F extends TextFilter
  ? string
  : F extends SelectFilter<infer T>
    ? T[number]
    : F extends MultiSelectFilter<infer T>
      ? Array<T[number]>
      : F extends BooleanFilter
        ? boolean
        : F extends DateRangeFilter
          ? { from?: string; to?: string }
          : F extends NumberRangeFilter
            ? { min?: number; max?: number }
            : never

export type InferFilterState<S extends Record<string, AnyFilter>> = {
  [K in keyof S]?: FilterStateValue<S[K]>
}
