# URL sync guide

This guide shows how to keep filter state in sync with the browser URL using `@filterbridge/browser`.

---

## Prerequisites

```bash
pnpm add @filterbridge/core @filterbridge/react @filterbridge/browser
```

---

## Basic pattern

```tsx
import { parseFiltersFromUrl, replaceUrlFilters } from '@filterbridge/browser'
import { useFilterBridge } from '@filterbridge/react'
import { defineFilters, text, select, boolean } from '@filterbridge/core'

const orderFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  archived: boolean(),
})

function OrdersPage() {
  const bridge = useFilterBridge(orderFilters, {
    // Initialize from the current URL
    initialState: parseFiltersFromUrl(orderFilters),
    // Write back to the URL on every change
    onChange(state) {
      replaceUrlFilters(orderFilters, state)
    },
  })

  return (
    <>
      <input
        value={bridge.state.search ?? ''}
        onChange={(e) => bridge.set('search', e.target.value)}
      />
      <button onClick={() => bridge.reset()}>Reset</button>
    </>
  )
}
```

---

## How it works

1. On mount, `parseFiltersFromUrl` reads `window.location.search` and parses it using your schema.
2. The parsed state becomes the `initialState` for `useFilterBridge`.
3. Every time filters change, `onChange` fires and `replaceUrlFilters` updates the browser URL via `window.history.replaceState`.
4. Non-filter params (e.g. `page`, `tab`) are automatically preserved in the URL.

---

## Preserving non-filter params

`replaceUrlFilters` reads `window.location.search` by default and keeps any query params that are not part of your schema.

Example: if the URL is `/orders?page=2&tab=open&search=acme` and you clear the `search` filter, the URL becomes `/orders?page=2&tab=open`.

---

## Using pushState instead of replaceState

If you want filter changes to create new browser history entries (so Back/Forward navigate between filter states), use `pushUrlFilters`:

```ts
import { pushUrlFilters } from '@filterbridge/browser'

const bridge = useFilterBridge(orderFilters, {
  initialState: parseFiltersFromUrl(orderFilters),
  onChange(state) {
    pushUrlFilters(orderFilters, state)
  },
})
```

Note: this does not yet handle `popstate` events to sync state back from history navigation. Full back/forward support is planned for a later wave.

---

## Using `createFilterUrl` without navigation

If you only need a URL string (for a share button, for a link, etc.) without navigating:

```ts
import { createFilterUrl } from '@filterbridge/browser'

const shareUrl = window.location.origin + createFilterUrl(
  orderFilters,
  bridge.state,
  { pathname: '/orders' }
)
```

---

## SSR safety

All helpers return empty state / no-op safely when `window` is not available.

```ts
// Returns {} on the server
const state = parseFiltersFromUrl(orderFilters)

// No-op on the server
replaceUrlFilters(orderFilters, state)
```

---

## Known limitations

- **Back/forward navigation:** `popstate` events are not handled. Pressing Back after a filter change navigates the URL but does not update React state. Full navigation support is planned.
- **Next.js App Router:** Use the dedicated `@filterbridge/next` package once available. The browser package works in client components but does not integrate with server-side `searchParams`.
- **React Strict Mode:** `onChange` may fire twice per state change. This results in two identical `replaceState` calls — harmless in practice.
- **Debounce:** No built-in debounce. For text inputs, wrap `set` in your own debounce if needed.
