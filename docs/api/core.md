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

At runtime it returns the same object passed to it, after one check. Its main purpose is to let TypeScript infer and preserve literal types from filter option arrays.

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

**It throws when two filters resolve to the same URL param key** (`0.3.1`):

```ts
defineFilters({
  createdAtFrom: text(),
  createdAt: dateRange(), // also writes createdAtFrom
})
// Error: [filterbridge] defineFilters(): filters "createdAtFrom" and "createdAt"
// both use the URL param "createdAtFrom". Rename one, or give it an explicit
// keys override.
```

This is possible without any [custom key](#custom-url-keys) and was possible before `0.3.1`, where `toSearchParams` silently let the last writer win — so one of the two filters round-tripped to a value it never held. The fix is to rename a filter, or to give one of them a `keys` override.

Throwing, rather than warning, follows the rule [ADR-002](../decisions/002-default-values.md) sets for `assertValidDefaults`: a schema is static configuration evaluated once at module load, so a collision is a source-level mistake that fails identically on every run, not untrusted input arriving in a render path.

Note that `parseFilters`, `toSearchParams` and `toQueryDto` accept a plain object too. `defineFilters` is where a schema gets checked, which is the argument for calling it rather than writing the object literal inline.

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

| Type          | Rules                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| `text`        | Trims whitespace; empty string → `undefined`                                               |
| `select`      | Only values in options list are accepted; others → `undefined`                             |
| `multiSelect` | Comma-separated string or `string[]`; invalid values discarded; empty result → `undefined` |
| `boolean`     | `"true"` / `"1"` → `true`; `"false"` / `"0"` → `false`; otherwise → `undefined`            |
| `dateRange`   | Reads `<name>From` / `<name>To`; empty string ignored; both absent → `undefined`           |
| `numberRange` | Reads `<name>Min` / `<name>Max`; non-numeric → ignored; both absent → `undefined`          |

The two range rows describe the default key names. A filter with a [`keys` override](#custom-url-keys) reads whichever keys it declares instead, and does **not** also read the derived ones.

Keys not defined in the schema are ignored. Keys in the schema that produce `undefined` are omitted from the result — unless the filter declares a [default](#default-values), in which case the default takes their place.

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
})

parseFilters(schema, {}) // { status: 'paid' } — absent
parseFilters(schema, { status: 'bogus' }) // { status: 'paid' } — invalid
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

| Type          | Serialization                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `text`        | `search=value` (trimmed; omitted if empty or whitespace-only)                                                      |
| `select`      | `status=paid` (omitted unless the value is a string listed in `options`)                                           |
| `multiSelect` | `tags=urgent,review` (comma-joined; entries outside `options` are dropped, and the key is omitted if none survive) |
| `boolean`     | `active=true` or `active=false`                                                                                    |
| `dateRange`   | `<name>From=…` and/or `<name>To=…` (each side trimmed; omitted if absent or empty)                                 |
| `numberRange` | `<name>Min=…` and/or `<name>Max=…` (each side omitted if absent or non-finite)                                     |

The two range rows describe the default key names; a [`keys` override](#custom-url-keys) replaces them.

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

| Type          | Included when                                                                 |
| ------------- | ----------------------------------------------------------------------------- |
| `text`        | Non-empty after trimming (the trimmed value is emitted)                       |
| `select`      | The value is a string listed in the filter's `options`                        |
| `multiSelect` | Non-empty array, after dropping entries outside the filter's `options`        |
| `boolean`     | Any defined value                                                             |
| `dateRange`   | At least one of `from` or `to` is a non-empty string; empty sides are dropped |
| `numberRange` | At least one of `min` or `max` is finite; non-finite sides are dropped        |

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

### The DTO carries defaults; the URL does not

A filter at its [default](#default-values) **is** included here, even though `toSearchParams` omits it. The two outputs carry deliberately different bytes, and the reason is what happens on the other side.

Omitting a default from the URL is compression with a guaranteed decompressor: the URL is read back by `parseFilters`, which puts the default in again. Nothing is lost.

The DTO has no such closure. It leaves for a backend that does not run FilterBridge and cannot know the schema, so an omitted default is not compressed — it is gone. A page sitting at `status: 'paid'` would render "paid" in the control while the backend, handed `{}`, returned every row.

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
})

const state = parseFilters(schema, new URLSearchParams(''))
// { status: 'paid' } — the page is filtering

toSearchParams(schema, state).toString()
// '' — safe: parseFilters restores 'paid' on the way back in

toQueryDto(schema, state)
// { status: 'paid' } — the backend is told what is actually being filtered
```

`toQueryDto` applies the same fallback rule as `parseFilters`: a value that is absent, empty or invalid becomes the filter's default. That is what makes the DTO independent of whether the state has been through a URL — `toQueryDto(state)` always equals `toQueryDto(parseFilters(schema, toSearchParams(schema, state)))`.

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
function getDefaultFilterState<S extends Record<string, AnyFilter>>(schema: S): InferFilterState<S>
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

It returns the same object `parseFilters(schema, {})` does — this is the way to get it without an input. `multiSelect` arrays are fresh copies on every call, so mutating the result never reaches the schema.

You do **not** need it to complete a DTO: [`toQueryDto` already carries the defaults](#the-dto-carries-defaults-the-url-does-not). It is useful for seeding state outside the parse path, and it is what `@filterbridge/react` uses to keep hook state representable.

See [Defaults and `useFilterBridge`](#defaults-and-usefilterbridge) for the React side.

---

## Filter factories

`select`, `multiSelect` and `boolean` take an optional configuration object as their last argument. `dateRange` and `numberRange` take one too, but it carries only [`keys`](#custom-url-keys); `text` takes none. No filter but the first three accepts a `default` — see [which filters accept a default](#which-filters-accept-a-default):

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

defineFilters({ search: text() })
```

`text()` takes no configuration and **accepts no default** — see [which filters accept a default](#which-filters-accept-a-default). Deleting is continuous editing, so a default would repopulate the input while the user was still backspacing through it.

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
function dateRange(config?: DateRangeConfig): DateRangeFilter

interface DateRangeConfig {
  readonly keys?: { readonly from?: string; readonly to?: string }
}
```

Creates a date range filter. State shape: `{ from?: string; to?: string }`.

By default the URL keys are derived from the filter name:

- `createdAt` → `createdAtFrom` / `createdAtTo`
- `issuedAt` → `issuedAtFrom` / `issuedAtTo`

```ts
defineFilters({ createdAt: dateRange() })
// createdAt?: { from?: string; to?: string }
// URL: createdAtFrom=2026-01-01&createdAtTo=2026-01-31
```

`keys` overrides them, one side or both — see [custom URL keys](#custom-url-keys).

`dateRange()` **accepts no default**. A literal date default is wrong by construction — `'2026-01-01'` means something different every month and goes stale on its own. Express "last 30 days" as a discrete choice instead: `select(['7d', '30d', '90d'], { default: '30d' })`.

---

### `numberRange(config?)`

```ts
function numberRange(config?: NumberRangeConfig): NumberRangeFilter

interface NumberRangeConfig {
  readonly keys?: { readonly min?: string; readonly max?: string }
}
```

Creates a number range filter. State shape: `{ min?: number; max?: number }`.

By default the URL keys are derived from the filter name:

- `amount` → `amountMin` / `amountMax`
- `price` → `priceMin` / `priceMax`

```ts
defineFilters({ amount: numberRange() })
// amount?: { min?: number; max?: number }
// URL: amountMin=100&amountMax=500
```

`keys` overrides them, one side or both — see [custom URL keys](#custom-url-keys).

`numberRange()` **accepts no default**, for the same reason as `text()`: a number input passes through the empty string as an ordinary step of editing — backspacing `150` to `20` goes through `''` — so a default would snap the field back mid-edit.

---

## Custom URL keys

_Added in `0.3.1`._

A range filter writes two params, named after the filter by default. When the query string is consumed by something that already has an opinion about its parameter names — an existing REST endpoint, a URL scheme that predates the library, a backend shared with a non-JavaScript client — `keys` renames them:

```ts
const filters = defineFilters({
  createdAt: dateRange({ keys: { from: 'created_after', to: 'created_before' } }),
  amount: numberRange({ keys: { min: 'min_cents', max: 'max_cents' } }),
})

toSearchParams(filters, {
  createdAt: { from: '2026-01-01', to: '2026-01-31' },
  amount: { min: 100, max: 500 },
}).toString()
// created_after=2026-01-01&created_before=2026-01-31&min_cents=100&max_cents=500
```

Four things worth knowing:

**Either side may be given alone.** `dateRange({ keys: { from: 'after' } })` on a filter named `createdAt` writes `after` and `createdAtTo`. Half-configured is a real state — an API that renamed one param and not the other — and a mixed URL is a better outcome than a builder that throws for not having been told something it could derive.

**The key replaces the whole param name, not a suffix.** That is what makes `created_after` reachable from a filter named `createdAt`; a suffix override could only ever produce `createdAt_after`.

**`toQueryDto` is unaffected.** The DTO is keyed by filter name and nests ranges as `{ from, to }` / `{ min, max }` no matter what the URL looks like:

```ts
toQueryDto(filters, { amount: { min: 100 } })
// { amount: { min: 100 } }  — not { min_cents: 100 }
```

A custom key is a URL concern. Renaming JSON properties for a backend is a different problem and is out of scope.

**Everything downstream follows automatically.** `parseFilters`, `toSearchParams`, `getFilterParamKeys` and `@filterbridge/next`'s normalization all read the same derivation, so `createFilterUrl` strips a custom key as reliably as a derived one and a server parse matches a client parse.

### `filterParamKeys(name, filter)` and `getFilterParamKeys(schema)`

```ts
function filterParamKeys(name: string, filter: AnyFilter): string[]
function getFilterParamKeys(schema: FilterSchema): string[]

function dateRangeParamKeys(name: string, filter: DateRangeFilter): { from: string; to: string }
function numberRangeParamKeys(name: string, filter: NumberRangeFilter): { min: string; max: string }
```

The derivation itself, exported because adapters need it. A scalar filter occupies its own name; a range occupies two keys, in from/to and min/max order.

```ts
getFilterParamKeys(filters)
// ['created_after', 'created_before', 'min_cents', 'max_cents']
```

`getFilterParamKeys` is also re-exported from `@filterbridge/browser`, where it has been public since `0.1.0` — the implementation moved into core in `0.3.1`, the export did not move.

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

- **Changing a default in code changes what old links mean.** A bookmark saved as `/invoices` shows whatever the default is _today_, not what it was when the link was saved. If a filter's meaning must be stable across deploys — a link pasted in a ticket, an email, a report — do not give it a default.
- **"No value" becomes unreachable through the URL.** With `archived: boolean({ default: false })` there is no query string that means "show archived and unarchived". Model the third state explicitly instead:

  ```ts
  // Not this
  archived: boolean({ default: false })

  // This — 'all' is reachable, 'active' is the landing state
  archived: select(['all', 'active', 'archived'], { default: 'active' })
  ```

Filters without a default behave exactly as they always have.

### Which filters accept a default

Only the filters whose value space is a **fixed, enumerable set**: `select`, `multiSelect` and `boolean`. `text()` takes no configuration at all, and the config `dateRange()` and `numberRange()` accept carries only [`keys`](#custom-url-keys) — so a default on any of the three is a type error, not a runtime one.

The criterion is not the widget you bind to — the library cannot know that. It is whether the value can pass through "empty" as an intermediate step of a single editing gesture.

| Filter        | Default | Why                                                                                                                     |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `select`      | yes     | A fixed set. Choosing another option is one discrete act.                                                               |
| `boolean`     | yes     | Three states, all discrete.                                                                                             |
| `multiSelect` | yes     | Unchecking to `[]` is the destination of a click, not a step on the way somewhere.                                      |
| `text`        | **no**  | Free text is edited character by character and passes through `''`. A default would repopulate the input mid-backspace. |
| `numberRange` | **no**  | Same: changing `150` to `20` passes through `''`.                                                                       |
| `dateRange`   | **no**  | A literal date default is stale by construction — `'2026-01-01'` means something different every month.                 |

The cases those three would have served are better modelled discretely. "Last 30 days" is a choice, not a date:

```ts
// Not this
createdAt: dateRange({ default: { from: '2026-01-01' } }) // ← type error

// This — the window is a fixed set, and it does not go stale
period: select(['7d', '30d', '90d'], { default: '30d' })
```

`docs/decisions/002-default-values.md` records the reasoning in full.

### Comparison rules

A value is considered "at its default" after the same normalization the serializers already apply:

| Type          | Equal to the default when                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `select`      | The value is identical                                                                           |
| `multiSelect` | Same entries in the same order — a reordered selection is a different state and stays in the URL |
| `boolean`     | The value is identical                                                                           |

`isAtDefault` answers `false` for every other filter kind, since they cannot carry a default.

### `isAtDefault(filter, value)`

```ts
function isAtDefault(filter: AnyFilter, value: unknown): boolean
```

Whether a value equals the filter's default, using the comparison table above. This is the exact rule the serializers apply when deciding to omit a value, exported so that adapters and UI code do not have to re-implement it — `@filterbridge/react` uses it for `activeFilterCount`, and an active-filter-chips UI needs it to show only what the user actually set.

```ts
const status = select(['pending', 'paid', 'failed'], { default: 'paid' })

isAtDefault(status, 'paid') // true  — emits no param
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
  | string // text
  | string // select (literal union in practice)
  | string[] // multiSelect (literal array in practice)
  | boolean // boolean
  | { from?: string; to?: string } // dateRange
  | { min?: number; max?: number } // numberRange
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
