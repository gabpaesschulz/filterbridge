import type { AnyFilter } from './filter-types'

export function defineFilters<S extends Record<string, AnyFilter>>(schema: S): S {
  return schema
}
