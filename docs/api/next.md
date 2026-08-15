# @filterbridge/next — API Reference

> **Status: experimental**

Next.js App Router adapter for FilterBridge. Does not depend on Next.js at runtime.

---

## Installation

```bash
pnpm add @filterbridge/core @filterbridge/browser @filterbridge/next
```

---

## Exports

```ts
import {
  normalizeNextSearchParams,
  parseNextSearchParams,
  parseNextSearchParamsAsync,
  createNextFilterHref,
} from '@filterbridge/next'

import type {
  NextSearchParamsInput,
  NextSearchParamsRecord,
  ReadonlyURLSearchParamsLike,
  MaybePromise,
  CreateNextFilterHrefOptions,
} from '@filterbridge/next'
```

---

## Types

### `NextSearchParamsRecord`

Plain object as Next.js provides to server components.

```ts
type NextSearchParamsRecord = Record<string, string | string[] | undefined>
```

### `ReadonlyURLSearchParamsLike`

Structural type compatible with `ReadonlyURLSearchParams` from `next/navigation`.

```ts
type ReadonlyURLSearchParamsLike = {
  get?: (name: string) => string | null
  getAll?: (name: string) => string[]
  entries?: () => IterableIterator<[string, string]>
  toString?: () => string
}
```

### `NextSearchParamsInput`

Union of all accepted searchParams input formats.

```ts
type NextSearchParamsInput =
  | NextSearchParamsRecord
  | URLSearchParams
  | ReadonlyURLSearchParamsLike
  | null
  | undefined
```

### `MaybePromise<T>`

```ts
type MaybePromise<T> = T | Promise<T>
```

### `CreateNextFilterHrefOptions`

```ts
type CreateNextFilterHrefOptions = {
  pathname?: string // default: '/'
  searchParams?: NextSearchParamsInput
  hash?: string
  preserveExistingParams?: boolean // default: true
}
```

---

## `normalizeNextSearchParams(schema, searchParams?)`

Converts a Next.js `searchParams` value into a `Record<string, unknown>` suitable for `parseFilters()`.

```ts
function normalizeNextSearchParams<S extends FilterSchema>(
  schema: S,
  searchParams?: NextSearchParamsInput
): Record<string, unknown>
```

Schema-aware normalization:

| Filter kind                 | `string` input                     | `string[]` input      |
| --------------------------- | ---------------------------------- | --------------------- |
| `text`, `select`, `boolean` | kept as-is                         | first element used    |
| `multiSelect`               | kept as-is (parsed as CSV by core) | array preserved       |
| `dateRange`                 | reads `<name>From`/`<name>To`      | first element of each |
| `numberRange`               | reads `<name>Min`/`<name>Max`      | first element of each |

Params outside the schema are ignored. Null/undefined input returns `{}`.

---

## `parseNextSearchParams(schema, searchParams?)`

Parses a Next.js `searchParams` value into typed FilterBridge state.

```ts
function parseNextSearchParams<S extends FilterSchema>(
  schema: S,
  searchParams?: NextSearchParamsInput
): InferFilterState<S>
```

Delegates to `normalizeNextSearchParams()` then `parseFilters()`.

Does not access `window`. Safe for server components.

**Example:**

```ts
const state = parseNextSearchParams(invoiceFilters, {
  search: 'acme',
  status: 'paid',
  tags: ['urgent', 'recurring'],
  createdAtFrom: '2026-01-01',
  amountMin: '100',
})
// => {
//   search: 'acme',
//   status: 'paid',
//   tags: ['urgent', 'recurring'],
//   createdAt: { from: '2026-01-01' },
//   amount: { min: 100 },
// }
```

---

## `parseNextSearchParamsAsync(schema, searchParams?)`

Async variant that accepts a `MaybePromise<NextSearchParamsInput>`.

```ts
function parseNextSearchParamsAsync<S extends FilterSchema>(
  schema: S,
  searchParams?: MaybePromise<NextSearchParamsInput>
): Promise<InferFilterState<S>>
```

Useful for Next.js 15+ where `searchParams` in server components may be a `Promise`.

**Example:**

```ts
// Next.js 15 server component
export default async function Page({ searchParams }) {
  // searchParams may be Promise<Record<...>> in Next.js 15+
  const state = await parseNextSearchParamsAsync(invoiceFilters, searchParams)
  return <Client initialFilters={state} />
}
```

---

## `createNextFilterHref(schema, state, options?)`

Builds a URL href string from a schema and filter state.

```ts
function createNextFilterHref<S extends FilterSchema>(
  schema: S,
  state: InferFilterState<S>,
  options?: CreateNextFilterHrefOptions
): string
```

Does not access `window`. Safe for server components and client components alike.

**Example — basic:**

```ts
const href = createNextFilterHref(
  invoiceFilters,
  { search: 'acme' },
  {
    pathname: '/invoices',
  }
)
// => '/invoices?search=acme'
```

**Example — preserving non-filter params (default behavior):**

```ts
const href = createNextFilterHref(
  invoiceFilters,
  { search: 'acme' },
  {
    pathname: '/invoices',
    searchParams: { tab: 'open', page: '2', search: 'old', status: 'paid' },
  }
)
// => '/invoices?tab=open&page=2&search=acme'
// tab and page (non-filter) are preserved
// search and status (filter) are replaced/removed
```

**Example — discard all existing params:**

```ts
const href = createNextFilterHref(
  invoiceFilters,
  { search: 'acme' },
  {
    pathname: '/invoices',
    searchParams: { tab: 'open' },
    preserveExistingParams: false,
  }
)
// => '/invoices?search=acme'
```

**Example — with hash:**

```ts
const href = createNextFilterHref(
  invoiceFilters,
  { search: 'acme' },
  {
    pathname: '/invoices',
    hash: 'results',
  }
)
// => '/invoices?search=acme#results'
```

---

## Notes on Next.js compatibility

`@filterbridge/next` does not import from `next/navigation`, `next/server`, or `next/link`.
It accepts plain objects and URLSearchParams; you use the results with whatever Next.js API you prefer.

```ts
// All of these are valid — pick what fits your setup:

// Option A: plain <a> tag
<a href={href}>Share filters</a>

// Option B: Next.js Link
import Link from 'next/link'
<Link href={href}>Share filters</Link>

// Option C: programmatic navigation
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push(href)

// Option D: shallow replace without re-render (for filter updates)
router.replace(href, { scroll: false })
```
