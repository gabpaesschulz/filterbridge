import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import type { TanStackColumnFiltersState, ToTanStackColumnFiltersOptions } from './types'
import { isEmpty } from './utils'

export function toTanStackColumnFilters<S extends FilterSchema>(
  schema: S,
  state: InferFilterState<S>,
  options?: ToTanStackColumnFiltersOptions<S>
): TanStackColumnFiltersState {
  const columnIds = options?.columnIds
  const result: TanStackColumnFiltersState = []

  for (const key of Object.keys(schema)) {
    const value = (state as Record<string, unknown>)[key]

    if (isEmpty(value)) continue

    const id = columnIds?.[key as keyof InferFilterState<S>] ?? key

    result.push({ id, value })
  }

  return result
}
