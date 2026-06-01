# @filterbridge/next

> **Status: experimental** — the API is stable enough to use, but may change before 1.0.

Next.js App Router adapter for [FilterBridge](https://github.com/gabpaesschulz/filterbridge).

---

## What this package does

Bridges the gap between Next.js App Router `searchParams` and FilterBridge filter state.

In Next.js App Router, server components receive `searchParams` as a plain object
(`Record<string, string | string[] | undefined>`) or, in Next.js 15+, as a `Promise` of that object.
This package converts those values into typed FilterBridge state and back into navigable hrefs.

---

## What this package does NOT do

- Does not import from `next/navigation`, `next/server`, or `next/link`
- Does not wrap or depend on Next.js at runtime
- Does not create a React hook
- Does not call `router.push()` or `router.replace()` automatically
- Does not sync state with the URL automatically
- Does not manage pagination or sorting

---

## Installation

```bash
pnpm add @filterbridge/core @filterbridge/browser @filterbridge/next
```

---

## The server/client pattern

```
Next App Router searchParams (server)
  → parseNextSearchParamsAsync()
  → initialState
  → Client component with useFilterBridge()
  → createNextFilterHref()   ← builds href for <Link> or router.push()
```

### Server component

```tsx
// app/invoices/page.tsx
import { parseNextSearchParamsAsync } from '@filterbridge/next'
import { invoiceFilters } from './filters'
import { InvoicesClient } from './invoices-client'

type PageProps = {
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const initialFilters = await parseNextSearchParamsAsync(invoiceFilters, searchParams)

  return <InvoicesClient initialFilters={initialFilters} />
}
```

### Client component

```tsx
// app/invoices/invoices-client.tsx
'use client'

import { useFilterBridge } from '@filterbridge/react'
import { createNextFilterHref } from '@filterbridge/next'
import { invoiceFilters } from './filters'
import type { InferFilterState } from '@filterbridge/core'

type Props = {
  initialFilters: InferFilterState<typeof invoiceFilters>
}

export function InvoicesClient({ initialFilters }: Props) {
  const bridge = useFilterBridge(invoiceFilters, {
    initialState: initialFilters,
  })

  const href = createNextFilterHref(invoiceFilters, bridge.state, {
    pathname: '/invoices',
  })

  return (
    <>
      <input
        value={bridge.state.search ?? ''}
        onChange={(e) => bridge.set('search', e.target.value)}
      />

      <a href={href}>Share current filters</a>
      {/* or: <Link href={href}>Share current filters</Link> */}
    </>
  )
}
```

---

## API

### `parseNextSearchParams(schema, searchParams?)`

Parses a Next.js `searchParams` object into typed FilterBridge state.

```ts
import { parseNextSearchParams } from '@filterbridge/next'

const state = parseNextSearchParams(invoiceFilters, {
  search: 'acme',
  status: 'paid',
})
// => { search: 'acme', status: 'paid' }
```

Accepts:
- `Record<string, string | string[] | undefined>` — server component searchParams
- `URLSearchParams`
- `ReadonlyURLSearchParams`-like object
- `null` or `undefined` → returns `{}`

Returns `InferFilterState<typeof schema>`.

---

### `parseNextSearchParamsAsync(schema, searchParams?)`

Async variant. Accepts a `Promise` wrapping any of the above inputs.
Useful for Next.js 15+ where `searchParams` may be a Promise.

```ts
const state = await parseNextSearchParamsAsync(invoiceFilters, searchParams)
```

---

### `normalizeNextSearchParams(schema, searchParams?)`

Low-level helper. Converts Next.js `searchParams` into a plain `Record<string, unknown>`
that can be passed directly to `parseFilters()` from `@filterbridge/core`.

You usually do not need to call this directly — use `parseNextSearchParams` instead.

```ts
const normalized = normalizeNextSearchParams(invoiceFilters, {
  search: 'acme',
  status: ['paid', 'failed'], // status is select, so first value wins
  tags: ['urgent', 'recurring'], // tags is multiSelect, so array is preserved
})
// => { search: 'acme', status: 'paid', tags: ['urgent', 'recurring'] }
```

Schema-aware normalization rules:
- `text`, `select`, `boolean`: if `string[]` is received, first element is used
- `multiSelect`: `string[]` is preserved as-is
- `dateRange`: reads `<name>From` and `<name>To` keys
- `numberRange`: reads `<name>Min` and `<name>Max` keys
- Params outside the schema are ignored

---

### `createNextFilterHref(schema, state, options?)`

Builds a URL href string from schema + state. Safe to call in server and client components.

```ts
import { createNextFilterHref } from '@filterbridge/next'

const href = createNextFilterHref(invoiceFilters, bridge.state, {
  pathname: '/invoices',
})
// => '/invoices?search=acme&status=paid'
```

Options:

| Option | Type | Default | Description |
|---|---|---|---|
| `pathname` | `string` | `'/'` | URL path prefix |
| `searchParams` | `NextSearchParamsInput` | — | Existing params to preserve |
| `hash` | `string` | — | Fragment identifier |
| `preserveExistingParams` | `boolean` | `true` | Keep non-filter params from searchParams |

When `preserveExistingParams` is `true` (the default):
- Non-filter params from `searchParams` are preserved
- Old filter params from `searchParams` are removed
- New filter params from `state` are applied

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
// tab and page preserved, old search/status removed, new search applied
```

---

## Important: no Next.js runtime dependency

`@filterbridge/next` does not import from `next/navigation`, `next/server`, or `next/link`.

It accepts Next-shaped values (plain objects, URLSearchParams) and returns plain values (typed state, href strings). This means:

- It works in SSR, edge functions, and unit tests without a Next.js environment
- You use the result with whatever Next.js APIs you prefer (`<Link>`, `router.push()`, etc.)
- You are not locked into a specific Next.js router version

---

## Limitations

- No automatic URL sync — you must build hrefs and navigate explicitly
- No `popstate` / back-forward support — page reload restores from URL via the server component
- No pagination or sorting adapters
- `createNextFilterHref` uses `set()` for URLSearchParams internally, so repeated non-filter
  params (e.g. `tab=a&tab=b`) will be deduplicated to the last value

---

## License

MIT
