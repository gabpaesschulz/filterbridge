import type {
  AnyFilter,
  BooleanFilter,
  DateRangeFilter,
  DateRangeValue,
  MultiSelectFilter,
  NumberRangeFilter,
  NumberRangeValue,
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
          ? DateRangeValue
          : F extends NumberRangeFilter
            ? NumberRangeValue
            : never

export type InferFilterState<S extends Record<string, AnyFilter>> = {
  [K in keyof S]?: FilterStateValue<S[K]>
}
