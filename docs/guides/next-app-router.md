# Using FilterBridge with Next.js App Router

`@filterbridge/next` provides lightweight utilities for integrating FilterBridge filter schemas
with Next.js App Router's server/client component model.

This guide shows a complete pattern for a filters page.

---

## The pattern

```
Next.js server component
  → receives searchParams from Next.js (plain object or Promise)
  → parseNextSearchParamsAsync() → typed initialState
  → passes initialState to a client component

Client component
  → useFilterBridge(schema, { initialState })
  → renders filter inputs bound to bridge.set()
  → createNextFilterHref() → href string
  → navigates using <Link href>, router.push(), or router.replace()
```

Back/forward navigation triggers a full server component re-render,
which re-parses the URL params and passes new `initialState` down.

---

## Step 1 — Define your filter schema

```ts
// app/invoices/filters.ts
import { defineFilters, text, select, multiSelect, boolean, dateRange, numberRange } from '@filterbridge/core'

export const invoiceFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'recurring', 'overdue'] as const),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})
```

---

## Step 2 — Parse filters in the server component

```tsx
// app/invoices/page.tsx
import { parseNextSearchParamsAsync } from '@filterbridge/next'
import { invoiceFilters } from './filters'
import { InvoicesClient } from './invoices-client'

// Works with both Next.js 14 (sync searchParams) and Next.js 15 (Promise searchParams)
type PageProps = {
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const initialFilters = await parseNextSearchParamsAsync(invoiceFilters, searchParams)

  // You can fetch data here using the typed state
  // const invoices = await fetchInvoices(toQueryDto(invoiceFilters, initialFilters))

  return <InvoicesClient initialFilters={initialFilters} />
}
```

---

## Step 3 — Manage state and navigate in the client component

```tsx
// app/invoices/invoices-client.tsx
'use client'

import { useFilterBridge } from '@filterbridge/react'
import { createNextFilterHref } from '@filterbridge/next'
import { useRouter, usePathname } from 'next/navigation'
import { invoiceFilters } from './filters'
import type { InferFilterState } from '@filterbridge/core'

type Props = {
  initialFilters: InferFilterState<typeof invoiceFilters>
}

export function InvoicesClient({ initialFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const bridge = useFilterBridge(invoiceFilters, {
    initialState: initialFilters,
    onChange(nextState) {
      // Navigate on every filter change
      const href = createNextFilterHref(invoiceFilters, nextState, { pathname })
      router.replace(href, { scroll: false })
    },
  })

  return (
    <div>
      <input
        placeholder="Search invoices..."
        value={bridge.state.search ?? ''}
        onChange={(e) => bridge.set('search', e.target.value)}
      />

      <select
        value={bridge.state.status ?? ''}
        onChange={(e) => bridge.set('status', e.target.value as 'pending' | 'paid' | 'failed')}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="failed">Failed</option>
      </select>

      <button onClick={() => bridge.reset()}>Reset filters</button>
    </div>
  )
}
```

---

## Step 4 — Server-side data fetching with the typed DTO

```tsx
// app/invoices/page.tsx (extended)
import { toQueryDto } from '@filterbridge/core'
import { parseNextSearchParamsAsync } from '@filterbridge/next'
import { invoiceFilters } from './filters'
import { InvoicesClient } from './invoices-client'

export default async function InvoicesPage({ searchParams }) {
  const initialFilters = await parseNextSearchParamsAsync(invoiceFilters, searchParams)

  // Convert typed state to a clean backend DTO
  const dto = toQueryDto(invoiceFilters, initialFilters)
  // dto: { search?: string, status?: string, tags?: string[], ... }

  const invoices = await fetchInvoices(dto)

  return <InvoicesClient initialFilters={initialFilters} invoices={invoices} />
}
```

---

## Generating a shareable href

To generate a shareable link without navigating:

```tsx
const href = createNextFilterHref(invoiceFilters, bridge.state, {
  pathname: '/invoices',
})

// Use with Next.js Link
<Link href={href}>Share current filters</Link>

// Or with a plain anchor
<a href={href}>Copy link</a>
```

---

## Preserving non-filter params

`createNextFilterHref` preserves params that are not part of the filter schema by default.
This keeps `tab`, `page`, and similar UI params intact when filters change.

```ts
// Current URL: /invoices?tab=open&page=2&status=paid
const href = createNextFilterHref(
  invoiceFilters,
  { search: 'acme' },         // new filter state
  {
    pathname: '/invoices',
    searchParams: currentSearchParams, // pass current URL params to preserve non-filter ones
  }
)
// Result: /invoices?tab=open&page=2&search=acme
// — tab and page preserved, status removed, search applied
```

To get `currentSearchParams` in a client component:

```ts
import { useSearchParams } from 'next/navigation'
const searchParams = useSearchParams() // ReadonlyURLSearchParams
```

`createNextFilterHref` accepts `ReadonlyURLSearchParams` directly.

---

## Difference between @filterbridge/browser and @filterbridge/next

| | `@filterbridge/browser` | `@filterbridge/next` |
|---|---|---|
| Input | URL strings, `URLSearchParams`, `URL`, location-like | Next.js `searchParams` record, URLSearchParams |
| Reads `window` | Yes (falls back gracefully) | Never |
| Updates history | Yes (`pushUrlFilters`, `replaceUrlFilters`) | No — returns href only |
| Best for | Generic browser URL sync | Next.js App Router server/client pattern |

---

## Known limitations

- No automatic URL sync — you call `router.replace(href)` in `onChange` explicitly
- No `popstate` listener — browser back/forward triggers a full server component re-render,
  which re-parses and re-initializes state correctly via `initialState`
- No pagination or sorting adapters
- Repeated non-filter URL params (e.g., `?tag=a&tag=b`) are deduplicated when passed through
  `createNextFilterHref`'s `searchParams` option
