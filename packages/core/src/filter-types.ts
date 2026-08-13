/** State shape of a `dateRange` filter, and of its configured default. */
export interface DateRangeValue {
  from?: string
  to?: string
}

/** State shape of a `numberRange` filter, and of its configured default. */
export interface NumberRangeValue {
  min?: number
  max?: number
}

export interface TextFilter {
  readonly _kind: 'text'
  readonly default?: string
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
  readonly default?: Readonly<DateRangeValue>
}

export interface NumberRangeFilter {
  readonly _kind: 'numberRange'
  readonly default?: Readonly<NumberRangeValue>
}

export type AnyFilter =
  | TextFilter
  | SelectFilter<readonly string[]>
  | MultiSelectFilter<readonly string[]>
  | BooleanFilter
  | DateRangeFilter
  | NumberRangeFilter

export type FilterSchema = Record<string, AnyFilter>
