# `@filterbridge/browser` — API Reference

> **Status:** experimental. API may change before the first stable release.

Browser URL synchronization helpers for FilterBridge. Framework-agnostic — works anywhere `window.history` is available.

---

## Installation

```bash
pnpm add @filterbridge/browser @filterbridge/core
```

---

## Entry points

| Import path                   | Contents                                                                                              | Requires React |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | -------------- |
| `@filterbridge/browser`       | `getFilterParamKeys`, `parseFiltersFromUrl`, `createFilterUrl`, `replaceUrlFilters`, `pushUrlFilters` | No             |
| `@filterbridge/browser/react` | `usePopstateSync`                                                                                     | Yes            |

React is an **optional** peer dependency. The root entry never imports it, so the package stays usable in plain Node, a Vue app, or a vanilla script. Only `@filterbridge/browser/react` pulls React in.

---

## `getFilterParamKeys(schema)`

Returns the list of URL search-param keys that the schema produces.

```ts
import { getFilterParamKeys } from '@filterbridge/browser'
import { defineFilters, text, select, dateRange, numberRange } from '@filterbridge/core'

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid'] as const),
  issuedAt: dateRange(),
  amount: numberRange(),
})

getFilterParamKeys(filters)
// ["search", "status", "issuedAtFrom", "issuedAtTo", "amountMin", "amountMax"]
```

### Key naming rules

| Filter type   | URL keys                 |
| ------------- | ------------------------ |
| `text`        | `<name>`                 |
| `select`      | `<name>`                 |
| `multiSelect` | `<name>`                 |
| `boolean`     | `<name>`                 |
| `dateRange`   | `<name>From`, `<name>To` |
| `numberRange` | `<name>Min`, `<name>Max` |

Keys are returned in schema definition order.

---

## `parseFiltersFromUrl(schema, input?)`

Parses filter state from a URL or search string, using `parseFilters` from `@filterbridge/core` internally.

```ts
import { parseFiltersFromUrl } from '@filterbridge/browser'

// Read from window.location.search (browser only)
const state = parseFiltersFromUrl(filters)

// Explicit string
const state = parseFiltersFromUrl(filters, '?search=acme&status=paid')

// URL object
const state = parseFiltersFromUrl(filters, new URL('https://example.com/?search=acme'))

// URLSearchParams
const state = parseFiltersFromUrl(filters, new URLSearchParams('search=acme'))

// location-like object
const state = parseFiltersFromUrl(filters, { search: '?search=acme' })
```

### Behaviour

- Returns `InferFilterState<typeof schema>` — fully typed.
- Ignores query params not present in the schema.
- Returns `{}` on empty or invalid input.
- Returns `{}` safely when `window` is not available (SSR).

---

## `createFilterUrl(schema, state, options?)`

Creates a URL path string from a schema and state.

```ts
import { createFilterUrl } from '@filterbridge/browser'

createFilterUrl(filters, { search: 'acme', status: 'paid' }, { pathname: '/invoices' })
// "/invoices?search=acme&status=paid"

// No filters — no ?
createFilterUrl(filters, {}, { pathname: '/invoices' })
// "/invoices"
```

### Options

```ts
type CreateFilterUrlOptions = {
  pathname?: string // Default: window.location.pathname or "/"
  currentSearch?: string | URLSearchParams // Existing params to consider
  hash?: string // Hash fragment without #
  preserveExistingParams?: boolean // Default: true
}
```

### `preserveExistingParams` behaviour

When `true` (default) and `currentSearch` is provided:

- Non-filter params are preserved.
- Old filter params are removed and replaced by the current state.

```ts
createFilterUrl(
  filters,
  { search: 'acme' },
  {
    pathname: '/invoices',
    currentSearch: '?page=2&tab=open&search=old',
    preserveExistingParams: true,
  }
)
// "/invoices?page=2&tab=open&search=acme"
```

When `false`:

```ts
createFilterUrl(
  filters,
  { search: 'acme' },
  {
    pathname: '/invoices',
    currentSearch: '?page=2',
    preserveExistingParams: false,
  }
)
// "/invoices?search=acme"
```

---

## `replaceUrlFilters(schema, state, options?)`

Updates the browser URL using `window.history.replaceState`. Does not add a new history entry.

```ts
import { replaceUrlFilters } from '@filterbridge/browser'

replaceUrlFilters(filters, { search: 'acme' })
// Calls window.history.replaceState(state, "", "/current-path?search=acme")
```

Automatically reads `window.location.search` to preserve non-filter params.

### Options

```ts
type SyncUrlOptions = CreateFilterUrlOptions & {
  history?: Pick<History, 'replaceState' | 'pushState'> // Injectable for testing
  state?: unknown // History state object (defaults to window.history.state)
  title?: string // History title (defaults to "")
}
```

Safe to call when `window` is not available — no-op if no history is found.

---

## `pushUrlFilters(schema, state, options?)`

Same as `replaceUrlFilters`, but uses `window.history.pushState` — adds a new browser history entry.

```ts
import { pushUrlFilters } from '@filterbridge/browser'

pushUrlFilters(filters, { search: 'acme' })
```

---

## `usePopstateSync(schema, onState, options?)`

> Imported from `@filterbridge/browser/react`.

Subscribes to the browser's `popstate` event and, on every back/forward navigation, re-parses `window.location.search` with the schema and hands the result to `onState`.

```tsx
import { parseFiltersFromUrl, pushUrlFilters } from '@filterbridge/browser'
import { usePopstateSync } from '@filterbridge/browser/react'
import { useFilterBridge } from '@filterbridge/react'

function OrdersPage() {
  const bridge = useFilterBridge(orderFilters, {
    initialState: parseFiltersFromUrl(orderFilters),
    onChange: (state) => pushUrlFilters(orderFilters, state),
  })

  usePopstateSync(orderFilters, bridge.syncState)

  return null
}
```

### Parameters

| Parameter         | Type                                   | Description                                                                           |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `schema`          | `FilterSchema`                         | Used to parse the URL. Read at event time, so an inline schema will not re-subscribe. |
| `onState`         | `(state: InferFilterState<S>) => void` | Called on each `popstate` with the state parsed from the current URL.                 |
| `options.enabled` | `boolean`                              | Defaults to `true`. Set to `false` to keep the listener detached.                     |

### Behaviour

- Does **not** call `onState` on mount. Use `parseFiltersFromUrl` for the initial state.
- Reads the URL when the event fires, not when the hook subscribes.
- The listener is removed on unmount and when `enabled` becomes `false`.
- `onState` and `schema` are kept in refs, so changing either does not re-subscribe.
- No-op when `window` is undefined. Nothing is touched during render, so the hook is safe inside a server-rendered component.

### Pairing with `syncState`

Pass [`bridge.syncState`](./react.md#syncstatestate), not `setMany`. `syncState` replaces the whole state — so filters removed from the URL are removed from the UI — and it does not fire `onChange`. Using a mutator that fires `onChange` here would write the adopted URL straight back to history.

---

## Types

```ts
import type { CreateFilterUrlOptions, SyncUrlOptions, UrlLike } from '@filterbridge/browser'
import type { UsePopstateSyncOptions } from '@filterbridge/browser/react'

type UrlLike = string | URL | URLSearchParams | { search: string }

type CreateFilterUrlOptions = {
  pathname?: string
  currentSearch?: string | URLSearchParams
  hash?: string
  preserveExistingParams?: boolean
}

type SyncUrlOptions = CreateFilterUrlOptions & {
  history?: Pick<History, 'replaceState' | 'pushState'>
  state?: unknown
  title?: string
}

type UsePopstateSyncOptions = {
  enabled?: boolean
}
```

---

## Limitations

- Back/forward only navigates between filter states if you write them with `pushUrlFilters`. With `replaceUrlFilters` there is a single history entry, so there is nothing to go back to — see the [URL sync guide](../guides/url-sync.md#backforward-navigation).
- `usePopstateSync` listens for `popstate` only. Programmatic `pushState` / `replaceState` calls do not emit that event, so state changes made by another library's router are not picked up.
- No React Router integration. For Next.js App Router use `@filterbridge/next`, where back/forward re-runs the server component instead.
- In React Strict Mode, `onChange` may fire twice per state update. The second `replaceState` call is harmless (same URL); with `pushUrlFilters` it produces a duplicate history entry in development only.
