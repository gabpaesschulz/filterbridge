/** State shape of a `dateRange` filter. */
export interface DateRangeValue {
  from?: string
  to?: string
}

/** State shape of a `numberRange` filter. */
export interface NumberRangeValue {
  min?: number
  max?: number
}

export interface TextFilter {
  readonly _kind: 'text'
}

export interface SelectFilter<T extends readonly string[]> {
  readonly _kind: 'select'
  readonly options: T
  readonly default?: T[number]
}

export interface MultiSelectFilter<T extends readonly string[]> {
  readonly _kind: 'multiSelect'
  readonly options: T
  readonly default?: ReadonlyArray<T[number]>
}

export interface BooleanFilter {
  readonly _kind: 'boolean'
  readonly default?: boolean
}

export interface DateRangeFilter {
  readonly _kind: 'dateRange'
}

export interface NumberRangeFilter {
  readonly _kind: 'numberRange'
}

export type AnyFilter =
  | TextFilter
  | SelectFilter<readonly string[]>
  | MultiSelectFilter<readonly string[]>
  | BooleanFilter
  | DateRangeFilter
  | NumberRangeFilter

export type FilterSchema = Record<string, AnyFilter>

/** The filters that accept a `default` — those whose value space is enumerable. */
export type DefaultableFilter =
  | SelectFilter<readonly string[]>
  | MultiSelectFilter<readonly string[]>
  | BooleanFilter
