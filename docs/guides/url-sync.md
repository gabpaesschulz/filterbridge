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

## Back/forward navigation

The basic pattern above is one-way: state flows to the URL, never back. Pressing Back changes the address bar while the UI keeps the old filters, and the two disagree until a reload.

Making it two-way takes two changes.

**1. Write with `pushUrlFilters`, not `replaceUrlFilters`.** `replaceState` overwrites the current history entry, so there is never anything to go back to. `pushState` gives each filter state its own entry.

**2. Adopt the URL on `popstate`** with `usePopstateSync`, from the `@filterbridge/browser/react` entry point:

```tsx
import { parseFiltersFromUrl, pushUrlFilters } from '@filterbridge/browser'
import { usePopstateSync } from '@filterbridge/browser/react'
import { useFilterBridge } from '@filterbridge/react'

function OrdersPage() {
  const bridge = useFilterBridge(orderFilters, {
    initialState: parseFiltersFromUrl(orderFilters),
    onChange(state) {
      pushUrlFilters(orderFilters, state)
    },
  })

  usePopstateSync(orderFilters, bridge.syncState)

  return (
    <input
      value={bridge.state.search ?? ''}
      onChange={(e) => bridge.set('search', e.target.value)}
    />
  )
}
```

Back and Forward now restore the filter UI without a page reload.

### Why `syncState` and not `setMany`

Two reasons, and both matter:

- **`syncState` replaces; `setMany` merges.** Going back to a URL without `status` must *remove* `status` from the UI. A merge would leave it there.
- **`syncState` does not fire `onChange`.** This is what stops the loop. `onChange` writes the state to the URL; `usePopstateSync` writes the URL to the state. If the sync path fired `onChange`, every Back press would immediately push the state you just navigated away from, and the Back button would appear frozen.

### Choosing push vs. replace

`pushUrlFilters` on every keystroke gives a text input one history entry per character, so Back walks the search term backwards letter by letter. That is fine for a demo and noisy for a real app.

If you want it quieter, either debounce the write, or push for discrete controls (selects, checkboxes) and replace for free text:

```ts
onChange(state) {
  const isTyping = state.search !== bridge.state.search
  if (isTyping) replaceUrlFilters(orderFilters, state)
  else pushUrlFilters(orderFilters, state)
}
```

`usePopstateSync` works the same either way — it only reacts to navigation, not to how the entry got there.

### Disabling the listener

```ts
usePopstateSync(orderFilters, bridge.syncState, { enabled: false })
```

The listener is detached while `enabled` is `false`, and reattached when it flips back to `true`.

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

// Subscribes in an effect, so it does nothing during a server render
usePopstateSync(orderFilters, bridge.syncState)
```

`@filterbridge/browser` itself never imports React — the hook lives behind the `/react` subpath, and React is an optional peer dependency. Importing the root entry in a non-React environment works unchanged.

---

## Known limitations

- **Other routers:** `usePopstateSync` listens for `popstate` only. Programmatic `pushState` / `replaceState` calls emit no event, so filter changes driven by another router are not picked up.
- **Next.js App Router:** Use the dedicated `@filterbridge/next` package. Back/forward there re-runs the server component, which re-parses `searchParams` — no listener needed.
- **React Strict Mode:** `onChange` may fire twice per state change. With `replaceUrlFilters` that means two identical `replaceState` calls, which is harmless; with `pushUrlFilters` it adds a duplicate history entry in development builds.
- **Debounce:** No built-in debounce. For text inputs, wrap `set` in your own debounce if needed — see [Choosing push vs. replace](#choosing-push-vs-replace).
