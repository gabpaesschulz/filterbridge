# @filterbridge/tanstack

[![npm](https://img.shields.io/npm/v/@filterbridge/tanstack)](https://www.npmjs.com/package/@filterbridge/tanstack)
[![license](https://img.shields.io/npm/l/@filterbridge/tanstack)](../../LICENSE)

> **Status:** experimental — `v0.2.0`. API may change before `v1.0`.

TanStack Table adapter for [FilterBridge](https://github.com/gabpaesschulz/filterbridge).

Converts FilterBridge filter state into TanStack-compatible `columnFilters`, and optionally back again. Also includes simple client-side filter functions.

FilterBridge does not replace TanStack Table. It only converts FilterBridge filter state into TanStack-compatible column filters.

---

## Installation

```bash
npm install @filterbridge/tanstack @filterbridge/core
# TanStack Table is a peer dependency
npm install @tanstack/react-table
```

---

## Quick example

```ts
import { defineFilters, text, select, multiSelect, boolean, dateRange, numberRange } from '@filterbridge/core'
import { toTanStackColumnFilters } from '@filterbridge/tanstack'

const invoiceFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'recurring'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

const columnFilters = toTanStackColumnFilters(invoiceFilters, {
  search: 'acme',
  status: 'paid',
  tags: ['urgent'],
  archived: false,
  issuedAt: { from: '2026-01-01', to: '2026-01-31' },
  amount: { min: 100, max: 2500 },
})

// Result:
// [
//   { id: 'search', value: 'acme' },
//   { id: 'status', value: 'paid' },
//   { id: 'tags', value: ['urgent'] },
//   { id: 'archived', value: false },
//   { id: 'issuedAt', value: { from: '2026-01-01', to: '2026-01-31' } },
//   { id: 'amount', value: { min: 100, max: 2500 } },
// ]
```

Pass `columnFilters` directly to `useReactTable`:

```ts
const table = useReactTable({
  data,
  columns,
  state: { columnFilters },
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  filterFns: filterBridgeFilterFns,
})
```

---

## API reference

### `toTanStackColumnFilters(schema, state, options?)`

Converts FilterBridge state to `TanStackColumnFiltersState`.

- Omits `undefined`, empty arrays, and empty range objects.
- Preserves schema key order.
- Does not mutate `state`.

```ts
toTanStackColumnFilters(schema, state)
toTanStackColumnFilters(schema, state, { columnIds: { search: 'customerName' } })
```

### `fromTanStackColumnFilters(schema, columnFilters, options?)`

Converts `TanStackColumnFiltersState` back to FilterBridge state.

- Validates values against the schema.
- Removes invalid or empty values.
- Accepts multiSelect as array or comma-separated string.
- Accepts boolean as `boolean`, `"true"`, `"false"`, `"1"`, `"0"`.
- Accepts numberRange as `{ min, max }` object or `[min, max]` tuple.

```ts
const state = fromTanStackColumnFilters(schema, columnFilters)
```

### `filterBridgeFilterFns`

Object of simple client-side filter functions compatible with TanStack Table's `filterFns` option.

```ts
const table = useReactTable({
  filterFns: filterBridgeFilterFns,
})
```

Available filter functions:

| Key | Behavior |
|-----|----------|
| `text` | Case-insensitive string contains |
| `select` | Strict equality |
| `multiSelect` | Intersection (cell array or scalar) |
| `boolean` | Boolean equality |
| `dateRange` | ISO string comparison with `from`/`to` |
| `numberRange` | Numeric comparison with `min`/`max` |

These are utilities for demos and prototyping. Real applications may use server-side filtering and ignore `filterBridgeFilterFns` entirely.

---

## `columnIds` option

Both `toTanStackColumnFilters` and `fromTanStackColumnFilters` accept a `columnIds` option that maps FilterBridge filter keys to TanStack column IDs.

This is useful when the TanStack column ID differs from the FilterBridge filter key — for example, when `search` filters by a `customerName` column.

```ts
toTanStackColumnFilters(schema, state, {
  columnIds: {
    search: 'customerName',
    issuedAt: 'issuedDate',
  },
})
```

The reverse mapping is applied automatically in `fromTanStackColumnFilters`.

---

## Module augmentation for TypeScript

If TanStack Table reports a type error on custom `filterFn` string names, use module augmentation:

```ts
import '@tanstack/react-table'

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

## Limitations

- `filterBridgeFilterFns.dateRange` uses lexicographic ISO string comparison. It does not parse timezones or non-ISO formats.
- `filterBridgeFilterFns.text` does fuzzy matching by default (substring includes). It does not rank results.
- Server-side filtering is not implemented here — this package only converts state formats.
- No React hook is provided in this package. Use `@filterbridge/react` for React state management.
- No pagination or sorting adapters.

---

## Relationship to TanStack Table

This package adapts FilterBridge state for TanStack Table. It does not wrap `useReactTable`, render any table UI, or replace TanStack Table's filtering logic. Your TanStack Table configuration is entirely under your control.

---

## Related packages

- [`@filterbridge/core`](../core/README.md) — schema DSL, parsing, serialization
- [`@filterbridge/react`](../react/README.md) — `useFilterBridge` hook
- [`docs/api/tanstack.md`](../../docs/api/tanstack.md) — detailed API reference
- [Root README](../../README.md) — project overview
- [GitHub](https://github.com/gabpaesschulz/filterbridge)
