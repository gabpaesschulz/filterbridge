# @filterbridge/core — API Reference

Full API reference for the core package.

See [`packages/core/README.md`](../../packages/core/README.md) for a shorter usage-oriented overview.

---

## Functions

### `defineFilters(schema)`

```ts
function defineFilters<S extends Record<string, AnyFilter>>(schema: S): S
```

Creates a typed filter schema.

The function is an identity function at runtime — it returns the same object passed to it. Its purpose is to enable TypeScript to infer and preserve literal types from filter option arrays.

```ts
const orderFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})
```

The returned schema is passed to `parseFilters`, `toSearchParams`, and `toQueryDto`. It serves as the single source of truth for filter structure and type information.

---

### `parseFilters(schema, input)`

```ts
function parseFilters<S extends Record<string, AnyFilter>>(
  schema: S,
  input: Record<string, unknown> | URLSearchParams
): InferFilterState<S>
```

Parses raw input into typed filter state.

**Input formats:**

```ts
// Plain object — any string-valued object works
const state = parseFilters(schema, {
  search: 'invoice',
  status: 'paid',
  tags: 'urgent,review',
  active: 'true',
  createdAtFrom: '2026-01-01',
  createdAtTo: '2026-01-31',
  amountMin: '100',
  amountMax: '500',
})

// URLSearchParams
const state = parseFilters(schema, new URLSearchParams(window.location.search))

// Next.js App Router (searchParams prop is a plain object)
const state = parseFilters(schema, searchParams)
```

**Parsing rules by filter type:**

| Type | Rules |
|------|-------|
| `text` | Trims whitespace; empty string → `undefined` |
| `select` | Only values in options list are accepted; others → `undefined` |
| `multiSelect` | Comma-separated string or `string[]`; invalid values discarded; empty result → `undefined` |
| `boolean` | `"true"` / `"1"` → `true`; `"false"` / `"0"` → `false`; otherwise → `undefined` |
| `dateRange` | Reads `<name>From` / `<name>To`; empty string ignored; both absent → `undefined` |
| `numberRange` | Reads `<name>Min` / `<name>Max`; non-numeric → ignored; both absent → `undefined` |

Keys not defined in the schema are ignored. Keys in the schema that produce `undefined` are omitted from the result.

**Return value:**

`InferFilterState<S>` — a typed object where all keys are optional and each value type is inferred from the corresponding filter definition.

---

### `toSearchParams(schema, state)`

```ts
function toSearchParams<S extends Record<string, AnyFilter>>(
  schema: S,
  state: InferFilterState<S>
): URLSearchParams
```

Serializes typed filter state to `URLSearchParams`.

**Serialization rules by filter type:**

| Type | Serialization |
|------|---------------|
| `text` | `search=value` (omitted if empty) |
| `select` | `status=paid` |
| `multiSelect` | `tags=urgent,review` (comma-joined; omitted if empty array) |
| `boolean` | `active=true` or `active=false` |
| `dateRange` | `<name>From=…` and/or `<name>To=…` (each side omitted if absent) |
| `numberRange` | `<name>Min=…` and/or `<name>Max=…` (each side omitted if absent) |

Output is deterministic: the same state always produces the same params string, with keys in schema definition order.

**Usage:**

```ts
const params = toSearchParams(schema, state)
// → URLSearchParams

// As a string
params.toString()
// search=invoice&status=paid&tags=urgent%2Creview&active=true...

// Append to a URL
const url = new URL('https://example.com/orders')
url.search = params.toString()
```

---

### `toQueryDto(schema, state)`

```ts
function toQueryDto<S extends Record<string, AnyFilter>>(
  schema: S,
  state: InferFilterState<S>
): InferFilterState<S>
```

Converts typed filter state into a clean object suitable for backend requests.

**Cleanup rules:**

| Type | Included when |
|------|---------------|
| `text` | Non-empty string |
| `select` | Any defined value |
| `multiSelect` | Non-empty array |
| `boolean` | Any defined value |
| `dateRange` | At least one of `from` or `to` is present |
| `numberRange` | At least one of `min` or `max` is present |

**Example:**

```ts
const state = {
  search: 'invoice',
  status: 'paid',
  tags: ['urgent'],
  createdAt: { from: '2026-01-01', to: '2026-01-31' },
}

const dto = toQueryDto(schema, state)
// {
//   search: 'invoice',
//   status: 'paid',
//   tags: ['urgent'],
//   createdAt: { from: '2026-01-01', to: '2026-01-31' },
// }
```

The return type is the same as `InferFilterState<S>` — all fields are optional. The object will only contain fields that have meaningful values.

**Use case:**

Pass the DTO directly to your API client:

```ts
const dto = toQueryDto(schema, state)
const data = await fetch(`/api/orders?${new URLSearchParams(dto as Record<string, string>)}`)

// or with a typed client like ky, axios, etc.
const data = await client.get('/api/orders', { params: dto })
```

---

## Filter factories

### `text()`

```ts
function text(): TextFilter
```

Creates a text filter definition.

```ts
defineFilters({ search: text() })
// search?: string
```

---

### `select(options)`

```ts
function select<const T extends readonly string[]>(options: T): SelectFilter<T>
```

Creates a single-value select filter from a fixed options list. TypeScript infers literal union types from the options array.

```ts
defineFilters({
  status: select(['pending', 'paid', 'failed']),
})
// status?: 'pending' | 'paid' | 'failed'
```

The `const` type parameter ensures literal types are preserved without requiring `as const` at the call site.

---

### `multiSelect(options)`

```ts
function multiSelect<const T extends readonly string[]>(options: T): MultiSelectFilter<T>
```

Creates a multi-value select filter. State is an array of valid option values.

```ts
defineFilters({
  tags: multiSelect(['urgent', 'review', 'archived']),
})
// tags?: Array<'urgent' | 'review' | 'archived'>
```

Parsing accepts comma-separated strings (`tags=urgent,review`) or arrays.

---

### `boolean()`

```ts
function boolean(): BooleanFilter
```

Creates a boolean filter.

```ts
defineFilters({ active: boolean() })
// active?: boolean
```

---

### `dateRange()`

```ts
function dateRange(): DateRangeFilter
```

Creates a date range filter. State shape: `{ from?: string; to?: string }`.

The URL keys are derived from the filter name:
- `createdAt` → `createdAtFrom` / `createdAtTo`
- `issuedAt` → `issuedAtFrom` / `issuedAtTo`

```ts
defineFilters({ createdAt: dateRange() })
// createdAt?: { from?: string; to?: string }
```

---

### `numberRange()`

```ts
function numberRange(): NumberRangeFilter
```

Creates a number range filter. State shape: `{ min?: number; max?: number }`.

The URL keys are derived from the filter name:
- `amount` → `amountMin` / `amountMax`
- `price` → `priceMin` / `priceMax`

```ts
defineFilters({ amount: numberRange() })
// amount?: { min?: number; max?: number }
```

---

## Types

### `InferFilterState<TSchema>`

```ts
type InferFilterState<S extends Record<string, AnyFilter>> = {
  [K in keyof S]?: FilterStateValue<S[K]>
}
```

Infers the full state type from a schema. All fields are optional.

```ts
const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid']),
  amount: numberRange(),
})

type State = InferFilterState<typeof schema>
// {
//   search?: string
//   status?: 'pending' | 'paid'
//   amount?: { min?: number; max?: number }
// }
```

---

### `FilterStateValue<TFilter>`

```ts
type FilterStateValue<F extends AnyFilter> =
  | string           // text
  | string           // select (literal union in practice)
  | string[]         // multiSelect (literal array in practice)
  | boolean          // boolean
  | { from?: string; to?: string }    // dateRange
  | { min?: number; max?: number }    // numberRange
```

Infers the state type for a single filter.

---

### `FilterSchema`

```ts
type FilterSchema = Record<string, AnyFilter>
```

The type of the object passed to `defineFilters`.

---

### `AnyFilter`

```ts
type AnyFilter =
  | TextFilter
  | SelectFilter<readonly string[]>
  | MultiSelectFilter<readonly string[]>
  | BooleanFilter
  | DateRangeFilter
  | NumberRangeFilter
```

Union of all filter definition types.

---

### Individual filter types

```ts
interface TextFilter {
  readonly _kind: 'text'
}

interface SelectFilter<T extends readonly string[]> {
  readonly _kind: 'select'
  readonly options: T
}

interface MultiSelectFilter<T extends readonly string[]> {
  readonly _kind: 'multiSelect'
  readonly options: T
}

interface BooleanFilter {
  readonly _kind: 'boolean'
}

interface DateRangeFilter {
  readonly _kind: 'dateRange'
}

interface NumberRangeFilter {
  readonly _kind: 'numberRange'
}
```

These are exported for use in custom adapters or extended integrations.
