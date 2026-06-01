# TanStack Table integration guide

This guide shows how to use `@filterbridge/tanstack` to connect FilterBridge filter state to TanStack Table v8.

---

## Overview

FilterBridge manages filter state. TanStack Table handles rendering and filtering. The adapter converts one format to the other.

```txt
FilterBridge state
      │
      ▼  toTanStackColumnFilters()
TanStack columnFilters
      │
      ▼  useReactTable({ state: { columnFilters }, filterFns })
Filtered rows rendered in table
```

---

## Installation

```bash
pnpm add @filterbridge/core @filterbridge/react @filterbridge/tanstack
pnpm add @tanstack/react-table
```

---

## Step 1 — Define your FilterBridge schema

```ts
import { defineFilters, text, select, multiSelect, boolean, dateRange, numberRange } from '@filterbridge/core'

export const invoiceFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed', 'cancelled'] as const),
  tags: multiSelect(['urgent', 'recurring', 'international'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})
```

---

## Step 2 — Build your column definitions

Assign a `filterFn` string to each column:

```ts
import { createColumnHelper } from '@tanstack/react-table'

const col = createColumnHelper<Invoice>()

const columns = [
  col.accessor('customerName', { filterFn: 'text' }),
  col.accessor('status',       { filterFn: 'select' }),
  col.accessor('tags',         { filterFn: 'multiSelect' }),
  col.accessor('archived',     { filterFn: 'boolean' }),
  col.accessor('issuedAt',     { filterFn: 'dateRange' }),
  col.accessor('amount',       { filterFn: 'numberRange' }),
]
```

For TypeScript to accept these custom string names, add a module augmentation once in your project:

```ts
// tanstack-augmentation.d.ts
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
```

---

## Step 3 — Convert FilterBridge state to columnFilters

```ts
import { toTanStackColumnFilters } from '@filterbridge/tanstack'

const columnFilters = toTanStackColumnFilters(invoiceFilters, bridge.state, {
  // Map the 'search' filter to the 'customerName' column
  columnIds: { search: 'customerName' },
})
```

The `columnIds` option is only needed when the column ID in TanStack differs from the filter key in FilterBridge.

---

## Step 4 — Pass to `useReactTable`

```ts
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table'
import { filterBridgeFilterFns } from '@filterbridge/tanstack'

const table = useReactTable({
  data,
  columns,
  state: { columnFilters },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  filterFns: filterBridgeFilterFns,
})
```

---

## Full example

```tsx
import { useFilterBridge } from '@filterbridge/react'
import { toTanStackColumnFilters, filterBridgeFilterFns } from '@filterbridge/tanstack'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table'
import { invoiceFilters } from './filters'
import { columns } from './columns'
import { INVOICES } from './data'

export function InvoicePage() {
  const bridge = useFilterBridge(invoiceFilters)

  const columnFilters = toTanStackColumnFilters(invoiceFilters, bridge.state, {
    columnIds: { search: 'customerName' },
  })

  const table = useReactTable({
    data: INVOICES,
    columns,
    state: { columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: filterBridgeFilterFns,
  })

  return (
    <>
      {/* Render your filter inputs here, using bridge.set() */}
      <table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getFilteredRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
```

---

## Server-side filtering

When using server-side filtering, you do not need `filterBridgeFilterFns` at all. Instead, convert FilterBridge state to a backend DTO and send it to your API:

```ts
const dto = bridge.toQueryDto()
// Send dto to your server — the server handles filtering
```

Use `toTanStackColumnFilters` only to pass `state.columnFilters` to `useReactTable` when you need client-side filtering or want TanStack to track filter state internally.

---

## URL synchronization

Combine with `@filterbridge/browser` to keep filters in sync with the URL:

```ts
import { parseFiltersFromUrl, replaceUrlFilters } from '@filterbridge/browser'

const bridge = useFilterBridge(invoiceFilters, {
  initialState: parseFiltersFromUrl(invoiceFilters),
  onChange(state) {
    replaceUrlFilters(invoiceFilters, state)
  },
})
```

---

## Limitations

- `filterBridgeFilterFns.dateRange` uses lexicographic ISO string comparison. It does not handle timezones or non-ISO date formats.
- `filterBridgeFilterFns.text` does substring matching, not ranking.
- Back/forward navigation does not update filter state automatically (see `@filterbridge/browser` known limitations).
- No pagination or sorting adapters in this wave.
