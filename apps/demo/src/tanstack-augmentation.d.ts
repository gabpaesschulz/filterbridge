// Module augmentation so TanStack Table accepts filterBridgeFilterFns names as strings.
import type { FilterFn } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface FilterFns {
    text: FilterFn<unknown>
    select: FilterFn<unknown>
    multiSelect: FilterFn<unknown>
    boolean: FilterFn<unknown>
    dateRange: FilterFn<unknown>
    numberRange: FilterFn<unknown>
  }
}
