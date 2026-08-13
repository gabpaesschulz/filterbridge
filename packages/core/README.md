# @filterbridge/core

Schema-first filter definitions for admin interfaces.

[![npm](https://img.shields.io/npm/v/@filterbridge/core)](https://www.npmjs.com/package/@filterbridge/core)
[![license](https://img.shields.io/npm/l/@filterbridge/core)](../../LICENSE)

**Status: experimental — `v0.1.0` published. API may change before `v1.0`.**

---

## What it does

`@filterbridge/core` lets you declare admin list filters once as a typed schema and derive URL parsing, serialization, and backend query DTOs from that single definition.

```ts
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '@filterbridge/core'

const orderFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})
```

---

## Installation

```bash
npm install @filterbridge/core
```

---

## Usage

### Parse from URL search params

```ts
// From a plain object (e.g. Next.js page props, manual construction)
const state = parseFilters(orderFilters, {
  search: 'invoice',
  status: 'paid',
  tags: 'urgent,review',
  active: 'true',
  createdAtFrom: '2026-01-01',
  createdAtTo: '2026-01-31',
  amountMin: '100',
  amountMax: '500',
})

// Directly from URLSearchParams
const state = parseFilters(orderFilters, new URLSearchParams(window.location.search))
```

### Serialize back to URL params

```ts
const params = toSearchParams(orderFilters, state)
// URLSearchParams:
// search=invoice&status=paid&tags=urgent%2Creview&active=true
// &createdAtFrom=2026-01-01&createdAtTo=2026-01-31
// &amountMin=100&amountMax=500
```

### Build a backend query DTO

```ts
const dto = toQueryDto(orderFilters, state)
// {
//   search: 'invoice',
//   status: 'paid',
//   tags: ['urgent', 'review'],
//   active: true,
//   createdAt: { from: '2026-01-01', to: '2026-01-31' },
//   amount: { min: 100, max: 500 },
// }
```

Undefined values, empty arrays, and empty range objects are all stripped from the DTO.

### Type inference

```ts
import type { InferFilterState } from '@filterbridge/core'

type OrderFilterState = InferFilterState<typeof orderFilters>
// {
//   search?: string
//   status?: 'pending' | 'paid' | 'failed'
//   tags?: Array<'urgent' | 'review' | 'archived'>
//   active?: boolean
//   createdAt?: { from?: string; to?: string }
//   amount?: { min?: number; max?: number }
// }
```

Literal types are inferred from `select` and `multiSelect` options without needing `as const`.

---

## API

### `defineFilters(schema)`

Creates a typed filter schema from a record of filter definitions.

```ts
const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  archived: boolean(),
})
```

The schema object is passed to `parseFilters`, `toSearchParams`, and `toQueryDto`. It is the single source of truth for filter structure and type information.

### `parseFilters(schema, input)`

Parses raw input into typed filter state.

Accepts:
- `Record<string, unknown>` — plain objects, Next.js `searchParams`, etc.
- `URLSearchParams` — browser URL, `new URLSearchParams(url.search)`, etc.

Invalid values are silently discarded. The result only contains keys that produced a valid value.

```ts
const state = parseFilters(schema, input)
// state is typed as InferFilterState<typeof schema>
```

### `toSearchParams(schema, state)`

Serializes typed filter state into `URLSearchParams`.

- Output is deterministic (same state always produces the same params string)
- Empty values are omitted
- `multiSelect` arrays are joined with commas: `tags=urgent,review`
- `dateRange` uses `<name>From` / `<name>To`: `createdAtFrom=…&createdAtTo=…`
- `numberRange` uses `<name>Min` / `<name>Max`: `amountMin=…&amountMax=…`

```ts
const params = toSearchParams(schema, state)
// → URLSearchParams
```

### `toQueryDto(schema, state)`

Converts typed filter state into a clean object for backend requests.

Rules:
- `text`: omitted if empty string
- `select`: included as-is
- `multiSelect`: omitted if empty array
- `boolean`: included as-is
- `dateRange`: included only if at least one side (`from` or `to`) is present
- `numberRange`: included only if at least one side (`min` or `max`) is present

```ts
const dto = toQueryDto(schema, state)
// → same shape as InferFilterState, but with empty values removed
```

### `getDefaultFilterState(schema)`

Returns the state a schema starts from: every filter that declares a `default`, at that default.

```ts
const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
})

getDefaultFilterState(schema)
// { status: 'paid' } — same as parseFilters(schema, {})
```

---

## Default values

Every filter factory takes an optional `{ default }` as its last argument. The default is used when the key is absent or invalid, and omitted by both serializers — so a page at its default state has no query string:

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
})

parseFilters(schema, {})                                // { status: 'paid' }
toSearchParams(schema, { status: 'paid' }).toString()   // ''
toSearchParams(schema, { status: 'failed' }).toString() // status=failed
```

The trade-off: a URL no longer fully describes the state, so changing a default in code changes what old bookmarks mean, and "no value" becomes unreachable through the URL for a filter that has one. See [Default values](../../docs/api/core.md#default-values) for the full rules and when not to use them.

A `select` or `multiSelect` default outside its `options` throws at schema definition.

---

## Filter factories

### `text()`

Free-text field.

| | |
|---|---|
| State type | `string \| undefined` |
| Parse | Trims whitespace; empty string becomes `undefined` |
| URL | `search=invoice` |
| DTO | `{ search: 'invoice' }` |

```ts
defineFilters({ search: text() })
```

---

### `select(options)`

Single value from a fixed list.

| | |
|---|---|
| State type | `"opt1" \| "opt2" \| undefined` |
| Parse | Only values in the options list are accepted; others become `undefined` |
| URL | `status=paid` |
| DTO | `{ status: 'paid' }` |

```ts
defineFilters({
  status: select(['pending', 'paid', 'failed']),
})
// status?: 'pending' | 'paid' | 'failed'
```

---

### `multiSelect(options)`

Multiple values from a fixed list.

| | |
|---|---|
| State type | `Array<"opt1" \| "opt2"> \| undefined` |
| Parse | Comma-separated string or array; invalid values discarded |
| URL | `tags=urgent,review` |
| DTO | `{ tags: ['urgent', 'review'] }` |

```ts
defineFilters({
  tags: multiSelect(['urgent', 'review', 'archived']),
})
// tags?: Array<'urgent' | 'review' | 'archived'>
```

Parsing accepts comma-separated values (`tags=urgent,review`), repeated query params
(`tags=urgent&tags=review`), or a mix of both (`tags=urgent,review&tags=archived`). Values outside
the option list are discarded. Serialization always writes the comma-separated form.

---

### `boolean()`

Boolean toggle.

| | |
|---|---|
| State type | `boolean \| undefined` |
| Parse | `"true"` / `"1"` → `true`; `"false"` / `"0"` → `false`; other values → `undefined` |
| URL | `active=true` |
| DTO | `{ active: true }` |

```ts
defineFilters({ active: boolean() })
```

---

### `dateRange()`

A range of ISO-like date strings.

| | |
|---|---|
| State type | `{ from?: string; to?: string } \| undefined` |
| Parse | Reads `<name>From` and `<name>To` keys; empty strings ignored |
| URL | `createdAtFrom=2026-01-01&createdAtTo=2026-01-31` |
| DTO | `{ createdAt: { from: '2026-01-01', to: '2026-01-31' } }` |

```ts
defineFilters({ createdAt: dateRange() })
// createdAt?: { from?: string; to?: string }
```

No date library is used. Strings are accepted as-is. Date validation is out of scope for this package.

---

### `numberRange()`

A numeric range.

| | |
|---|---|
| State type | `{ min?: number; max?: number } \| undefined` |
| Parse | Reads `<name>Min` and `<name>Max` keys; non-numeric strings ignored |
| URL | `amountMin=100&amountMax=500` |
| DTO | `{ amount: { min: 100, max: 500 } }` |

```ts
defineFilters({ amount: numberRange() })
// amount?: { min?: number; max?: number }
```

---

## Exported types

```ts
// Type utilities
InferFilterState<TSchema>   // infers full state type from a schema
FilterStateValue<TFilter>   // infers state type for a single filter

// Schema types
FilterSchema                // Record<string, AnyFilter>
AnyFilter                   // union of all filter types

// Individual filter types
TextFilter
SelectFilter<T>
MultiSelectFilter<T>
BooleanFilter
DateRangeFilter
NumberRangeFilter
```

---

## Known limitations

- No custom key suffixes for `dateRange` / `numberRange` (always uses `From`/`To` and `Min`/`Max`)
- No default values per filter
- No date string validation beyond accepting non-empty strings
- No React integration in this package — see `@filterbridge/react`

---

## See also

- [`@filterbridge/react`](../react) — React hook for filter state management
- [`@filterbridge/browser`](../browser) — browser URL sync helpers
- [`@filterbridge/tanstack`](../tanstack) — TanStack Table adapter
- [`@filterbridge/next`](../next) — Next.js App Router adapter
- [`docs/api/core.md`](../../docs/api/core.md) — detailed API reference
- [Root README](../../README.md) — project overview
- [GitHub](https://github.com/gabpaesschulz/filterbridge)
