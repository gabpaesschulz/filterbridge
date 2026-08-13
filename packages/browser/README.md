# @filterbridge/browser

[![npm](https://img.shields.io/npm/v/@filterbridge/browser)](https://www.npmjs.com/package/@filterbridge/browser)
[![license](https://img.shields.io/npm/l/@filterbridge/browser)](../../LICENSE)

> **Status:** experimental — `v0.2.0`. API may change before `v1.0`.

Browser URL synchronization helpers for [FilterBridge](https://github.com/gabpaesschulz/filterbridge).

Lets you initialize filter state from the current URL and keep the URL updated as filters change — without a framework adapter.

---

## Installation

```bash
npm install @filterbridge/browser @filterbridge/core
```

---

## Quick example

```tsx
import { parseFiltersFromUrl, replaceUrlFilters } from '@filterbridge/browser'
import { useFilterBridge } from '@filterbridge/react'
import { defineFilters, text, select, boolean } from '@filterbridge/core'

const invoiceFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  archived: boolean(),
})

function InvoicesPage() {
  const bridge = useFilterBridge(invoiceFilters, {
    // Initialize from the current URL on first render
    initialState: parseFiltersFromUrl(invoiceFilters),
    // Write back to the URL on every change
    onChange(state) {
      replaceUrlFilters(invoiceFilters, state)
    },
  })

  return (
    <input
      value={bridge.state.search ?? ''}
      onChange={(e) => bridge.set('search', e.target.value)}
    />
  )
}
```

Result: `/invoices` → `/invoices?search=acme` as the user types. Reloading the page restores the search filter.

---

## Back/forward navigation

The example above is one-way — state flows to the URL, not back. To make Back and Forward restore the filter UI, write with `pushUrlFilters` (so each state gets its own history entry) and adopt the URL on `popstate`:

```tsx
import { parseFiltersFromUrl, pushUrlFilters } from '@filterbridge/browser'
import { usePopstateSync } from '@filterbridge/browser/react'

const bridge = useFilterBridge(invoiceFilters, {
  initialState: parseFiltersFromUrl(invoiceFilters),
  onChange: (state) => pushUrlFilters(invoiceFilters, state),
})

usePopstateSync(invoiceFilters, bridge.syncState)
```

`bridge.syncState` replaces the whole state and does not fire `onChange` — which is what keeps the write-back from looping.

---

## Entry points

| Import path | Contents | Requires React |
|-------------|----------|----------------|
| `@filterbridge/browser` | URL parsing and history helpers | No |
| `@filterbridge/browser/react` | `usePopstateSync` | Yes |

React is an **optional** peer dependency. The root entry never imports it, so this package still works in a non-React app.

---

## API

### `parseFiltersFromUrl(schema, input?)`

Parses filter state from a URL or search string.

```ts
// Read from window.location.search
parseFiltersFromUrl(filters)

// String
parseFiltersFromUrl(filters, '?search=acme&status=paid')

// URL object
parseFiltersFromUrl(filters, new URL('https://example.com/?search=acme'))

// URLSearchParams
parseFiltersFromUrl(filters, new URLSearchParams('search=acme'))

// location-like
parseFiltersFromUrl(filters, { search: '?search=acme' })
```

Returns `InferFilterState<typeof schema>`. Returns `{}` safely when `window` is not available.

---

### `createFilterUrl(schema, state, options?)`

Creates a URL path string from schema and state.

```ts
createFilterUrl(filters, { search: 'acme' }, { pathname: '/invoices' })
// "/invoices?search=acme"

// Preserving non-filter params
createFilterUrl(filters, { search: 'acme' }, {
  pathname: '/invoices',
  currentSearch: '?page=2&tab=open',
})
// "/invoices?page=2&tab=open&search=acme"

// Removing old filter params
createFilterUrl(filters, {}, {
  pathname: '/invoices',
  currentSearch: '?page=2&search=old&status=paid',
})
// "/invoices?page=2"
```

Options:

```ts
type CreateFilterUrlOptions = {
  pathname?: string                        // Default: window.location.pathname or "/"
  currentSearch?: string | URLSearchParams // Existing params to preserve
  hash?: string                            // Hash fragment without #
  preserveExistingParams?: boolean         // Default: true
}
```

---

### `replaceUrlFilters(schema, state, options?)`

Updates the browser URL via `window.history.replaceState`. Does not add a history entry.

```ts
replaceUrlFilters(filters, { search: 'acme' })
```

Automatically reads `window.location.search` to preserve non-filter params. Safe to call outside a browser — no-op when `window.history` is not available.

---

### `pushUrlFilters(schema, state, options?)`

Same as `replaceUrlFilters`, but uses `window.history.pushState`.

```ts
pushUrlFilters(filters, { search: 'acme' })
```

---

### `getFilterParamKeys(schema)`

Returns the URL search-param keys produced by the schema.

```ts
getFilterParamKeys(defineFilters({
  search: text(),
  issuedAt: dateRange(),
  amount: numberRange(),
}))
// ["search", "issuedAtFrom", "issuedAtTo", "amountMin", "amountMax"]
```

---

### `usePopstateSync(schema, onState, options?)`

From `@filterbridge/browser/react`. Calls `onState` with the filter state parsed from the URL on every back/forward navigation.

```ts
usePopstateSync(filters, bridge.syncState)
usePopstateSync(filters, bridge.syncState, { enabled: false }) // detached
```

Does not fire on mount — use `parseFiltersFromUrl` for the initial state. The listener is removed on unmount, and the hook is a no-op when `window` is undefined.

---

## Preserving non-filter params

When you call `replaceUrlFilters`, params that are not part of your schema are preserved by default.

Example: URL is `/orders?page=2&search=acme`. You clear the search filter. Result: `/orders?page=2`.

---

## SSR safety

All helpers return empty state / no-op safely when `window` is not available.

---

## Limitations

- Back/forward only navigates between filter states if you write them with `pushUrlFilters`. `replaceUrlFilters` keeps a single history entry.
- `usePopstateSync` reacts to `popstate` only. Programmatic `pushState` / `replaceState` calls from another router emit no event and are not picked up.
- No Next.js App Router integration — use `@filterbridge/next` instead.
- No React Router integration.
- No debounce built in.

---

## Related packages

- [`@filterbridge/core`](../core/README.md) — schema DSL, parsing, serialization
- [`@filterbridge/react`](../react/README.md) — `useFilterBridge` hook
- [`@filterbridge/next`](../next/README.md) — Next.js App Router adapter
- [`docs/api/browser.md`](../../docs/api/browser.md) — detailed API reference
- [Root README](../../README.md) — project overview
- [GitHub](https://github.com/gabpaesschulz/filterbridge)
