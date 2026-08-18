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

/**
 * URL param key overrides for a `dateRange`.
 *
 * Either side may be given on its own — `{ from: 'created_after' }` leaves `to`
 * as `<name>To`. Half-configured is a real state (an API that renamed one param
 * and not the other), and a mixed URL is a better outcome than a builder that
 * throws for not having been told something it could derive.
 *
 * Named `keys` and not `key` deliberately: `key: string` stays free for a
 * future scalar override, so adding one will not rename this.
 */
export interface DateRangeKeys {
  readonly from?: string
  readonly to?: string
}

/** URL param key overrides for a `numberRange`. See {@link DateRangeKeys}. */
export interface NumberRangeKeys {
  readonly min?: string
  readonly max?: string
}

export interface DateRangeFilter {
  readonly _kind: 'dateRange'
  readonly keys?: DateRangeKeys
}

export interface NumberRangeFilter {
  readonly _kind: 'numberRange'
  readonly keys?: NumberRangeKeys
}

export type AnyFilter =
  | TextFilter
  | SelectFilter<readonly string[]>
  | MultiSelectFilter<readonly string[]>
  | BooleanFilter
  | DateRangeFilter
  | NumberRangeFilter

export type FilterSchema = Record<string, AnyFilter>
