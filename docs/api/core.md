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

**Repeated query params:**

A key that appears more than once is collected into an array rather than overwritten.

```ts
parseFilters(schema, new URLSearchParams('tags=urgent&tags=review'))
// → { tags: ['urgent', 'review'] }
```

For single-valued filters (`text`, `select`, `boolean`, and each side of `dateRange` /
`numberRange`) the first occurrence wins, matching `@filterbridge/next`:

```ts
parseFilters(schema, new URLSearchParams('search=a&search=b'))
// → { search: 'a' }
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

Keys not defined in the schema are ignored. Keys in the schema that produce `undefined` are omitted from the result — unless the filter declares a [default](#default-values), in which case the default takes their place.

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
})

parseFilters(schema, {})                   // { status: 'paid' } — absent
parseFilters(schema, { status: 'bogus' })  // { status: 'paid' } — invalid
parseFilters(schema, { status: 'failed' }) // { status: 'failed' }
```

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
| `text` | `search=value` (trimmed; omitted if empty or whitespace-only) |
| `select` | `status=paid` (omitted unless the value is a string listed in `options`) |
| `multiSelect` | `tags=urgent,review` (comma-joined; entries outside `options` are dropped, and the key is omitted if none survive) |
| `boolean` | `active=true` or `active=false` |
| `dateRange` | `<name>From=…` and/or `<name>To=…` (each side trimmed; omitted if absent or empty) |
| `numberRange` | `<name>Min=…` and/or `<name>Max=…` (each side omitted if absent or non-finite) |

Output is deterministic: the same state always produces the same params string, with keys in schema definition order.

Serialization normalizes the same values `parseFilters` does, so a state that differs only in whitespace produces the same URL and the round trip is stable:

```ts
toSearchParams(schema, { search: ' invoice ' }).toString()
// search=invoice

toSearchParams(schema, { search: '   ' }).toString()
// '' — a whitespace-only value is not a filter
```

`select` and `multiSelect` values are checked against the schema's `options` on the way out, with the same rule `parseFilters` applies on the way in. A value the schema forbids is dropped instead of being written to a URL that could not be read back:

```ts
toSearchParams(schema, { status: 'bogus' } as never).toString()
// '' — and a warning in development

toSearchParams(schema, { tags: ['urgent', 'zzz'] } as never).toString()
// tags=urgent
```

TypeScript alone does not prevent this: state arriving from `JSON.parse`, `localStorage`, a saved preset, or a cast is a plain object at runtime. The dropped value is reported through `console.warn` when `process.env.NODE_ENV !== 'production'`; the warning is absent from production builds, and serialization never throws.

A filter sitting at its [default](#default-values) is omitted, so a page at its default state has no query string at all:

```ts
const schema = defineFilters({
  status: select(['pending', 'paid'], { default: 'paid' }),
  search: text(),
})

toSearchParams(schema, { status: 'paid' }).toString()
// '' — the default is what parsing an empty query string produces anyway

toSearchParams(schema, { status: 'pending', search: 'acme' }).toString()
// status=pending&search=acme
```

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
| `text` | Non-empty after trimming (the trimmed value is emitted) |
| `select` | The value is a string listed in the filter's `options` |
| `multiSelect` | Non-empty array, after dropping entries outside the filter's `options` |
| `boolean` | Any defined value |
| `dateRange` | At least one of `from` or `to` is a non-empty string; empty sides are dropped |
| `numberRange` | At least one of `min` or `max` is finite; non-finite sides are dropped |

The DTO never contains an empty string. An absent key is what a backend can handle — `WHERE created_at >= ''` is not:

```ts
toQueryDto(schema, { search: '   ', createdAt: { from: '', to: '2026-01-31' } })
// { createdAt: { to: '2026-01-31' } }
```

The DTO also never contains a `select` or `multiSelect` value the schema rejects, so the backend receives only values the frontend's own schema accepts:

```ts
toQueryDto(schema, { status: 'bogus', tags: ['urgent', 'zzz'] } as never)
// { tags: ['urgent'] }
```

A filter at its [default](#default-values) is omitted here too, so the DTO and the URL always describe the same query. A backend that does not know the schema can be given the full picture with [`getDefaultFilterState`](#getdefaultfilterstateschema):

```ts
const full = { ...getDefaultFilterState(schema), ...toQueryDto(schema, state) }
```

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

### `getDefaultFilterState(schema)`

```ts
function getDefaultFilterState<S extends Record<string, AnyFilter>>(
  schema: S
): InferFilterState<S>
```

Returns the state a schema starts from: every filter that declares a [default](#default-values), at that default. Filters without one are absent.

```ts
const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
  pageSize: select(['25', '50', '100'], { default: '25' }),
})

getDefaultFilterState(schema)
// { status: 'paid', pageSize: '25' }
```

It returns the same object `parseFilters(schema, {})` does — this is the way to get it without an input. Range objects and `multiSelect` arrays are fresh copies on every call, so mutating the result never reaches the schema.

Useful for restoring what the serializers omit:

```ts
// The full query, defaults included, for a backend that does not know the schema
const full = { ...getDefaultFilterState(schema), ...toQueryDto(schema, state) }
```

See [Defaults and `useFilterBridge`](#defaults-and-usefilterbridge) for the React side.

---

## Filter factories

Every factory takes an optional configuration object as its last argument:

```ts
interface FilterConfig<TValue> {
  readonly default?: TValue
}
```

See [Default values](#default-values) for what `default` does across the three core functions.

### `text(config?)`

```ts
function text(config?: FilterConfig<string>): TextFilter
```

Creates a text filter definition.

```ts
defineFilters({ search: text() })
// search?: string

defineFilters({ search: text({ default: 'invoice' }) })
```

The default is trimmed, and a whitespace-only default is the same as no default.

---

### `select(options, config?)`

```ts
function select<const T extends readonly string[]>(
  options: T,
  config?: FilterConfig<T[number]>
): SelectFilter<T>
```

Creates a single-value select filter from a fixed options list. TypeScript infers literal union types from the options array.

```ts
defineFilters({
  status: select(['pending', 'paid', 'failed']),
})
// status?: 'pending' | 'paid' | 'failed'

defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
})
```

The `const` type parameter ensures literal types are preserved without requiring `as const` at the call site.

A default outside `options` throws at schema definition — see [validation](#defaults-are-validated).

---

### `multiSelect(options, config?)`

```ts
function multiSelect<const T extends readonly string[]>(
  options: T,
  config?: FilterConfig<ReadonlyArray<T[number]>>
): MultiSelectFilter<T>
```

Creates a multi-value select filter. State is an array of valid option values.

```ts
defineFilters({
  tags: multiSelect(['urgent', 'review', 'archived']),
})
// tags?: Array<'urgent' | 'review' | 'archived'>

defineFilters({
  tags: multiSelect(['urgent', 'review', 'archived'], { default: ['urgent'] }),
})
```

Parsing accepts comma-separated strings (`tags=urgent,review`), arrays, repeated query params
(`tags=urgent&tags=review`), or a mix (`tags=urgent,review&tags=archived`). Serialization always
writes the comma-separated form.

The default array is copied, so the schema cannot be mutated through it. An empty default is the same as no default. Any entry outside `options` throws at schema definition.

---

### `boolean(config?)`

```ts
function boolean(config?: FilterConfig<boolean>): BooleanFilter
```

Creates a boolean filter.

```ts
defineFilters({ active: boolean() })
// active?: boolean

defineFilters({ archived: boolean({ default: false }) })
```

---

### `dateRange(config?)`

```ts
function dateRange(config?: FilterConfig<DateRangeValue>): DateRangeFilter
```

Creates a date range filter. State shape: `{ from?: string; to?: string }`.

The URL keys are derived from the filter name:
- `createdAt` → `createdAtFrom` / `createdAtTo`
- `issuedAt` → `issuedAtFrom` / `issuedAtTo`

```ts
defineFilters({ createdAt: dateRange() })
// createdAt?: { from?: string; to?: string }

defineFilters({ createdAt: dateRange({ default: { from: '2026-01-01' } }) })
```

A partial default is allowed. Empty sides are dropped, and a default with no side left is the same as no default.

---

### `numberRange(config?)`

```ts
function numberRange(config?: FilterConfig<NumberRangeValue>): NumberRangeFilter
```

Creates a number range filter. State shape: `{ min?: number; max?: number }`.

The URL keys are derived from the filter name:
- `amount` → `amountMin` / `amountMax`
- `price` → `priceMin` / `priceMax`

```ts
defineFilters({ amount: numberRange() })
// amount?: { min?: number; max?: number }

defineFilters({ amount: numberRange({ default: { min: 0 } }) })
```

A partial default is allowed. Non-finite sides are dropped, and a default with no side left is the same as no default.

---

## Default values

Any filter can declare a default. It is the value `parseFilters` uses when the key is absent from the input **or** present but invalid, and the value both serializers omit.

```ts
const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
  pageSize: select(['25', '50', '100'], { default: '25' }),
})

parseFilters(schema, {})
// { status: 'paid', pageSize: '25' }

toSearchParams(schema, { status: 'paid', pageSize: '25' }).toString()
// '' — the landing page has no query string

toSearchParams(schema, { status: 'failed', pageSize: '25' }).toString()
// status=failed
```

The round trip is what makes this work: a default is omitted on the way out and restored on the way in, so `parseFilters(schema, toSearchParams(schema, state))` gives back the same state.

### What this costs

**A URL no longer fully describes the state.** `/invoices` and `/invoices?status=paid` are the same screen. Two consequences worth knowing before adding a default:

- **Changing a default in code changes what old links mean.** A bookmark saved as `/invoices` shows whatever the default is *today*, not what it was when the link was saved. If a filter's meaning must be stable across deploys — a link pasted in a ticket, an email, a report — do not give it a default.
- **"No value" becomes unreachable through the URL.** With `archived: boolean({ default: false })` there is no query string that means "show archived and unarchived". Model the third state explicitly instead:

  ```ts
  // Not this
  archived: boolean({ default: false })

  // This — 'all' is reachable, 'active' is the landing state
  archived: select(['all', 'active', 'archived'], { default: 'active' })
  ```

Filters without a default behave exactly as they always have.

### Comparison rules

A value is considered "at its default" after the same normalization the serializers already apply:

| Type | Equal to the default when |
|------|---------------------------|
| `text` | The trimmed value is identical — `' invoice '` matches a default of `'invoice'` |
| `select` | The value is identical |
| `multiSelect` | Same entries in the same order — a reordered selection is a different state and stays in the URL |
| `boolean` | The value is identical |
| `dateRange` | Both sides match; a range that matches on one side only is still written in full |
| `numberRange` | Both sides match, after dropping non-finite sides |

### `isAtDefault(filter, value)`

```ts
function isAtDefault(filter: AnyFilter, value: unknown): boolean
```

Whether a value equals the filter's default, using the comparison table above. This is the exact rule the serializers apply when deciding to omit a value, exported so that adapters and UI code do not have to re-implement it — `@filterbridge/react` uses it for `activeFilterCount`, and an active-filter-chips UI needs it to show only what the user actually set.

```ts
const status = select(['pending', 'paid', 'failed'], { default: 'paid' })

isAtDefault(status, 'paid')   // true  — emits no param
isAtDefault(status, 'failed') // false
```

Returns `false` for a filter with no default, so a schema that declares none behaves as if this did not exist.

---

### Defaults are validated

`select` and `multiSelect` check their default against `options` when the schema is defined, and throw if it does not belong:

```ts
select(['pending', 'paid'], { default: 'bogus' })
// Error: [filterbridge] select(): default "bogus" is not one of its options (pending, paid).
```

This throws, unlike the serializers, which drop a bad value and warn. A default is static schema configuration, not untrusted runtime input: an invalid one is a source-level typo that fails identically on every run, and failing at definition is better than silently parsing to `undefined` in production.

### Defaults and `useFilterBridge`

The React hook is uncontrolled and does not read schema defaults on its own. Seed it through a core function — anything that parses already includes them:

```ts
const filters = useFilterBridge(schema, {
  initialState: parseFiltersFromUrl(schema), // defaults included
})
```

There is no `resetToDefaults()` yet. `reset()` clears to `{}` and `resetToInitial()` restores the mount state, neither of which is "back to schema defaults". Until the hook has its own method, express it as a normal state write so `onChange` fires and the URL follows:

```ts
filters.setMany({ ...emptyState, ...getDefaultFilterState(schema) })
```

where `emptyState` maps every schema key to `undefined` — `setMany` merges rather than replaces, so the keys to drop have to be named.

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
  readonly default?: string
}

interface SelectFilter<T extends readonly string[]> {
  readonly _kind: 'select'
  readonly options: T
  readonly default?: T[number]
}

interface MultiSelectFilter<T extends readonly string[]> {
  readonly _kind: 'multiSelect'
  readonly options: T
  readonly default?: ReadonlyArray<T[number]>
}

interface BooleanFilter {
  readonly _kind: 'boolean'
  readonly default?: boolean
}

interface DateRangeFilter {
  readonly _kind: 'dateRange'
  readonly default?: Readonly<DateRangeValue>
}

interface NumberRangeFilter {
  readonly _kind: 'numberRange'
  readonly default?: Readonly<NumberRangeValue>
}
```

These are exported for use in custom adapters or extended integrations. `default` is present only when the builder was given one, already normalized.

---

### `FilterConfig<TValue>`

```ts
interface FilterConfig<TValue> {
  readonly default?: TValue
}
```

The configuration object every filter factory accepts as its last argument. See [Default values](#default-values).

---

### `DateRangeValue` / `NumberRangeValue`

```ts
interface DateRangeValue {
  from?: string
  to?: string
}

interface NumberRangeValue {
  min?: number
  max?: number
}
```

The state shapes of `dateRange` and `numberRange`, and the shape their defaults take.
