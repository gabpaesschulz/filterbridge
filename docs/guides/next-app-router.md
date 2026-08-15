# Using FilterBridge with Next.js App Router

`@filterbridge/next` provides lightweight utilities for integrating FilterBridge filter schemas
with Next.js App Router's server/client component model.

This guide shows a complete pattern for a filters page.

> **Every snippet below is copied out of a running application.**
> [`examples/next-app-router`](../../examples/next-app-router) is a Next.js 15 app that exercises
> this exact pattern, kept outside the pnpm workspace so it costs nothing to install. Read it, or
> run it: `cd examples/next-app-router && npm install && npm run dev`.
>
> Until `0.3.0` this guide was 220 lines of snippets that had never been executed, and two of its
> claims were wrong — see [back/forward](#back-and-forward-need-two-things), which is why the
> example exists.

---

## The pattern

```
Next.js server component
  → receives searchParams from Next.js (plain object or Promise)
  → parseNextSearchParamsAsync() → typed initialState
  → toQueryDto() → fetch
  → passes initialState to a client component

Client component
  → useFilterBridge(schema, { initialState })
  → renders filter inputs bound to bridge.set()
  → createNextFilterHref() → href string
  → router.push(href) to navigate
  → usePopstateSync(schema, bridge.syncState) so back/forward reaches the controls
```

---

## Step 1 — Define your filter schema

```ts
// app/invoices/filters.ts
import {
  defineFilters,
  text,
  select,
  multiSelect,
  boolean,
  dateRange,
  numberRange,
} from '@filterbridge/core'

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
import { toQueryDto } from '@filterbridge/core'
import { parseNextSearchParamsAsync } from '@filterbridge/next'
import { fetchInvoices } from './data'
import { invoiceFilters } from './filters'
import { InvoicesClient } from './invoices-client'

// Next.js 15: searchParams is a Promise. For Next.js 14 the sync
// parseNextSearchParams works with a plain record.
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const initialFilters = await parseNextSearchParamsAsync(invoiceFilters, searchParams)

  // The DTO, not the state, is what a backend receives. Note what this holds on
  // a bare URL with no query string: any filter declaring a `default` is in it,
  // because the URL omits a default and the DTO carries it. See ADR-002.
  const dto = toQueryDto(invoiceFilters, initialFilters)
  const invoices = await fetchInvoices(dto)

  return <InvoicesClient initialFilters={initialFilters} invoices={invoices} />
}
```

---

## Step 3 — Manage state and navigate in the client component

```tsx
// app/invoices/invoices-client.tsx
'use client'

import { usePopstateSync } from '@filterbridge/browser/react'
import type { InferFilterState } from '@filterbridge/core'
import { createNextFilterHref } from '@filterbridge/next'
import { useFilterBridge } from '@filterbridge/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { invoiceFilters } from './filters'

type Props = {
  initialFilters: InferFilterState<typeof invoiceFilters>
}

export function InvoicesClient({ initialFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const bridge = useFilterBridge(invoiceFilters, {
    initialState: initialFilters,
    onChange(nextState) {
      const href = createNextFilterHref(invoiceFilters, nextState, { pathname, searchParams })
      // queueMicrotask is a workaround — see "onChange and the render phase" below
      queueMicrotask(() => router.push(href, { scroll: false }))
    },
  })

  // Back and forward. See below for why this is not optional.
  usePopstateSync(invoiceFilters, bridge.syncState)

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

## Back and forward need two things

_Corrected in `0.3.0`, after the pattern above was executed for the first time._

This guide previously used `router.replace` and stated that back/forward "triggers a full server
component re-render, which re-parses and re-initializes state correctly". Both halves were wrong.

### 1. `router.push`, not `router.replace`

`replace` overwrites the current history entry. A page that only ever replaces has exactly one
entry, so pressing Back leaves the application entirely — there is no filter state to go back to.

The cost of `push` is one history entry per change, which includes one per keystroke in a text
input. Debounce the text field before calling `set`, or use `replace` for text and `push` for the
discrete controls.

### 2. `usePopstateSync`, because a server re-render is not enough

Back and forward really do re-run the server component and really do hand down a fresh
`initialFilters`. That changes nothing on its own. `useFilterBridge` is uncontrolled **by design**:
it captures `initialState` on the first render and ignores it afterwards, so that a parent re-render
cannot stomp on what the user is typing. React reconciles the client component rather than
remounting it.

Without a sync, the URL changes and the server-rendered rows change while the filter controls stay
exactly where they were. The two halves of the page disagree, which is worse than either being wrong
on its own.

```tsx
import { usePopstateSync } from '@filterbridge/browser/react'

usePopstateSync(invoiceFilters, bridge.syncState)
```

Two properties matter, and they are why this is the right tool rather than a hand-rolled effect on
`initialFilters`:

- **It fires on popstate and nothing else.** An effect keyed on the server's `initialFilters` also
  fires after every ordinary filter change, one server round trip late — which can snap a search box
  back to a stale value while the user is still typing.
- **`syncState` does not fire `onChange`.** Adopting the URL must not write the URL again; that
  turns one Back press into a fight with the history stack.

`@filterbridge/browser` is a separate install. The alternative is `key`-ing the client component off
the search string to force a remount, which works but throws away all component state on every
navigation.

---

## `onChange` and the render phase

`useFilterBridge` currently fires `onChange` from inside its `setState` updater, and React runs
updaters during render. Calling `router.push` directly from `onChange` therefore logs:

```txt
Cannot update a component (`Router`) while rendering a different component
```

Wrap the navigation in `queueMicrotask` until the hook is fixed:

```ts
queueMicrotask(() => router.push(href, { scroll: false }))
```

Tracked in
[Sprint 1 task 6](../sprints/sprint-1/06-onchange-fires-during-render.md). It does not affect
`@filterbridge/browser`'s `pushUrlFilters` / `replaceUrlFilters`, which write to `window.history`
rather than to React state.

---

## Step 4 — What the DTO carries that the URL does not

Step 2 already builds the DTO, because in practice you fetch in the same place you parse. The part
worth calling out separately is what it contains.

For a filter declaring a default:

```ts
const invoiceFilters = defineFilters({
  status: select(['pending', 'paid', 'failed'] as const, { default: 'pending' }),
})
```

a request to `/invoices` with **no query string at all** produces:

```ts
initialFilters // { status: 'pending' }
toQueryDto(invoiceFilters, initialFilters) // { status: 'pending' }
createNextFilterHref(invoiceFilters, initialFilters, { pathname }) // '/invoices'
```

The URL stays clean; the backend still receives the filter. Omitting a default from the URL is
compression with a guaranteed decompressor — `parseFilters` puts it back. Omitting it from the DTO
would be loss: the backend does not know the schema and would return everything, so the page would
render "pending" over a list of everything.

This is the rule from [ADR-002](../decisions/002-default-values.md), and the server component is
where it is easiest to get wrong. The
[example](../../examples/next-app-router) prints both outputs next to each other for exactly this
reason.

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
  { search: 'acme' }, // new filter state
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

|                 | `@filterbridge/browser`                              | `@filterbridge/next`                           |
| --------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Input           | URL strings, `URLSearchParams`, `URL`, location-like | Next.js `searchParams` record, URLSearchParams |
| Reads `window`  | Yes (falls back gracefully)                          | Never                                          |
| Updates history | Yes (`pushUrlFilters`, `replaceUrlFilters`)          | No — returns href only                         |
| Best for        | Generic browser URL sync                             | Next.js App Router server/client pattern       |

---

## Known limitations

- No automatic URL sync — you call `router.push(href)` in `onChange` explicitly
- No `popstate` listener **in this package**. Back/forward needs
  `usePopstateSync` from `@filterbridge/browser/react` — a server re-render alone does not reach the
  filter controls. [See above](#2-usepopstatesync-because-a-server-re-render-is-not-enough)
- `onChange` fires during the render phase, so a navigation call from it needs a `queueMicrotask`
  wrapper — [task 6](../sprints/sprint-1/06-onchange-fires-during-render.md)
- No pagination or sorting adapters
- Repeated non-filter URL params (e.g., `?tag=a&tag=b`) are deduplicated when passed through
  `createNextFilterHref`'s `searchParams` option

---

## The running example

[`examples/next-app-router`](../../examples/next-app-router) is this guide as an application:
server parse, client state, back/forward, a filter with a `default` so the URL-omits-but-DTO-carries
rule is visible, and a non-filter param that survives. Verified against Next.js `15.5.23`, React
`19.2.8` and FilterBridge `0.2.0`.
