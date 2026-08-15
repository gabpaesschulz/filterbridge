# @filterbridge/tanstack — API reference

> **Experimental** — API may change before a stable release.

---

## `toTanStackColumnFilters(schema, state, options?)`

Converts FilterBridge filter state to a `TanStackColumnFiltersState` array.

### Signature

```ts
function toTanStackColumnFilters<S extends FilterSchema>(
  schema: S,
  state: InferFilterState<S>,
  options?: ToTanStackColumnFiltersOptions<S>
): TanStackColumnFiltersState
```

### Behavior

- Iterates schema keys in declaration order.
- Skips `undefined`, empty arrays `[]`, and empty range objects `{}`.
- Uses the filter key as the column `id` by default.
- Applies `options.columnIds` to remap filter keys to column IDs.
- Does not mutate `state`.

### Example

```ts
const columnFilters = toTanStackColumnFilters(invoiceFilters, {
  search: 'acme',
  status: 'paid',
  amount: { min: 100, max: 2500 },
})

// [
//   { id: 'search', value: 'acme' },
//   { id: 'status', value: 'paid' },
//   { id: 'amount', value: { min: 100, max: 2500 } },
// ]
```

### `options.columnIds`

Maps filter keys to different column IDs when the TanStack column ID differs from the FilterBridge filter key.

```ts
toTanStackColumnFilters(schema, state, {
  columnIds: {
    search: 'customerName',
    issuedAt: 'issuedDate',
  },
})
```

---

## `fromTanStackColumnFilters(schema, columnFilters, options?)`

Converts a `TanStackColumnFiltersState` array back to FilterBridge state.

### Signature

```ts
function fromTanStackColumnFilters<S extends FilterSchema>(
  schema: S,
  columnFilters: TanStackColumnFiltersState,
  options?: FromTanStackColumnFiltersOptions<S>
): InferFilterState<S>
```

### Behavior

- Maps column IDs back to filter keys using reverse of `options.columnIds`.
- Validates values against the schema. Invalid values are discarded.
- Removes empty strings, empty arrays, and empty range objects.

### Type coercion per filter type

| Filter type   | Accepted values                                        |
| ------------- | ------------------------------------------------------ |
| `text`        | `string` (trimmed, non-empty)                          |
| `select`      | `string` in options list                               |
| `multiSelect` | `string[]` (filtered) or comma-separated string        |
| `boolean`     | `boolean`, `"true"`, `"false"`, `"1"`, `"0"`           |
| `dateRange`   | `{ from?: string; to?: string }`                       |
| `numberRange` | `{ min?: number; max?: number }` or `[min, max]` tuple |

---

## `filterBridgeFilterFns`

Object of client-side filter functions compatible with TanStack Table's `filterFns` option.

### Signature

```ts
const filterBridgeFilterFns: {
  text: FilterFnLike
  select: FilterFnLike
  multiSelect: FilterFnLike
  boolean: FilterFnLike
  dateRange: FilterFnLike
  numberRange: FilterFnLike
}
```

### Usage with `useReactTable`

```ts
const table = useReactTable({
  data,
  columns,
  state: { columnFilters },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  filterFns: filterBridgeFilterFns,
})
```

### Per-function behavior

#### `text`

- `row.getValue(columnId)` is cast to string.
- Comparison is case-insensitive substring (`includes`).
- Returns `true` when `filterValue` is empty, `undefined`, or `null`.

#### `select`

- Strict equality: `row.getValue(columnId) === filterValue`.
- Returns `true` when `filterValue` is empty, `undefined`, or `null`.

#### `multiSelect`

- `filterValue` must be an array.
- If the cell is an array: returns `true` if any cell value is in `filterValue`.
- If the cell is a scalar: returns `true` if the scalar is in `filterValue`.
- Returns `true` when `filterValue` is an empty array or `undefined`.

#### `boolean`

- `typeof filterValue !== 'boolean'` → returns `true`.
- Strict equality: `row.getValue(columnId) === filterValue`.

#### `dateRange`

- `filterValue` must be `{ from?: string; to?: string }`.
- Uses lexicographic ISO string comparison (`<`, `>`).
- Returns `true` when range has no `from` and no `to`.
- Returns `false` when cell value is empty and a range bound is set.

#### `numberRange`

- `filterValue` must be `{ min?: number; max?: number }`.
- Cell value is parsed to `number` if not already.
- Returns `false` when cell value is `NaN` and a bound is set.
- Returns `true` when neither `min` nor `max` is defined.

---

## Types

### `TanStackColumnFilter`

```ts
type TanStackColumnFilter = {
  id: string
  value: unknown
}
```

### `TanStackColumnFiltersState`

```ts
type TanStackColumnFiltersState = TanStackColumnFilter[]
```

### `ToTanStackColumnFiltersOptions<S>`

```ts
type ToTanStackColumnFiltersOptions<S extends FilterSchema> = {
  columnIds?: Partial<Record<keyof InferFilterState<S>, string>>
}
```

### `FromTanStackColumnFiltersOptions<S>`

```ts
type FromTanStackColumnFiltersOptions<S extends FilterSchema> = {
  columnIds?: Partial<Record<keyof InferFilterState<S>, string>>
}
```

### `FilterFnLike`

```ts
type FilterFnLike = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: unknown
) => boolean
```

Structurally compatible with TanStack Table's `FilterFn` without importing it.
