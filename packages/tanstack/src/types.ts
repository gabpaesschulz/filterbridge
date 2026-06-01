import type { FilterSchema, InferFilterState } from '@filterbridge/core'

export type TanStackColumnFilter = {
  id: string
  value: unknown
}

export type TanStackColumnFiltersState = TanStackColumnFilter[]

export type ToTanStackColumnFiltersOptions<S extends FilterSchema> = {
  columnIds?: Partial<Record<keyof InferFilterState<S>, string>>
}

export type FromTanStackColumnFiltersOptions<S extends FilterSchema> = {
  columnIds?: Partial<Record<keyof InferFilterState<S>, string>>
}

// Structural type compatible with TanStack Table's FilterFn without importing it
export type FilterFnLike = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: unknown
) => boolean
