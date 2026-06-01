import type {
  BooleanFilter,
  DateRangeFilter,
  MultiSelectFilter,
  NumberRangeFilter,
  SelectFilter,
  TextFilter,
} from './filter-types'

export function text(): TextFilter {
  return { _kind: 'text' }
}

export function select<const T extends readonly string[]>(options: T): SelectFilter<T> {
  return { _kind: 'select', options }
}

export function multiSelect<const T extends readonly string[]>(options: T): MultiSelectFilter<T> {
  return { _kind: 'multiSelect', options }
}

export function boolean(): BooleanFilter {
  return { _kind: 'boolean' }
}

export function dateRange(): DateRangeFilter {
  return { _kind: 'dateRange' }
}

export function numberRange(): NumberRangeFilter {
  return { _kind: 'numberRange' }
}
