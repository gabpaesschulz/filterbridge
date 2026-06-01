export interface TextFilter {
  readonly _kind: 'text'
}

export interface SelectFilter<T extends readonly string[]> {
  readonly _kind: 'select'
  readonly options: T
}

export interface MultiSelectFilter<T extends readonly string[]> {
  readonly _kind: 'multiSelect'
  readonly options: T
}

export interface BooleanFilter {
  readonly _kind: 'boolean'
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
