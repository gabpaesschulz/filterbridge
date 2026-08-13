# @filterbridge/react

React hook for managing filter state defined with `@filterbridge/core`.

[![npm](https://img.shields.io/npm/v/@filterbridge/react)](https://www.npmjs.com/package/@filterbridge/react)
[![license](https://img.shields.io/npm/l/@filterbridge/react)](../../LICENSE)

**Status: experimental — `v0.1.0` published. API may change before `v1.0`.**

---

## Overview

`@filterbridge/react` provides `useFilterBridge`, a hook that wraps a FilterBridge schema and gives you typed, clean filter state management for admin list screens.

It does **not** handle URL synchronization or routing — those are intentionally out of scope for this version.

---

## Installation

```bash
npm install @filterbridge/react @filterbridge/core
```

React 18+ is required as a peer dependency.

---

## Quick example

```tsx
import { defineFilters, multiSelect, text } from '@filterbridge/core'
import { useFilterBridge } from '@filterbridge/react'

const filters = defineFilters({
  search: text(),
  status: multiSelect(['pending', 'paid', 'failed']),
})

export function OrdersFilters() {
  const bridge = useFilterBridge(filters, {
    initialState: { search: 'invoice' },
    onChange(state) {
      // trigger data fetching here
      console.log('filters changed', state)
    },
  })

  return (
    <div>
      <input
        value={bridge.state.search ?? ''}
        onChange={(e) => bridge.set('search', e.target.value)}
      />

      <button onClick={() => bridge.set('status', ['paid'])}>Paid only</button>
      <button onClick={() => bridge.clear('status')}>Clear status</button>
      <button onClick={() => bridge.reset()}>Reset all</button>

      {bridge.hasActiveFilters && (
        <span>{bridge.activeFilterCount} active filters</span>
      )}

      <pre>{JSON.stringify(bridge.toQueryDto(), null, 2)}</pre>
    </div>
  )
}
```

---

## API

### `useFilterBridge(schema, options?)`

```ts
import { useFilterBridge } from '@filterbridge/react'

const bridge = useFilterBridge(schema, {
  initialState: { search: 'invoice' },
  onChange(state) {
    console.log('filters changed', state)
  },
})
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `initialState` | `Partial<InferFilterState<TSchema>>` | Initial filter values. Empty values are cleaned on initialization. |
| `onChange` | `(state: InferFilterState<TSchema>) => void` | Called after every state change except `syncState`. Not called on first render. |

#### Return value

| Property | Type | Description |
|----------|------|-------------|
| `state` | `InferFilterState<TSchema>` | Current filter state. Empty values are never present. |
| `set(key, value)` | `void` | Update a single filter. Empty values are removed automatically. |
| `setMany(values)` | `void` | Update multiple filters at once. `onChange` is called once. |
| `clear(key)` | `void` | Remove a single filter. |
| `reset()` | `void` | Clear all filters to `{}`. |
| `resetToInitial()` | `void` | Restore the `initialState` passed at mount. |
| `syncState(state)` | `void` | Replace the whole state with externally-provided state. Does **not** call `onChange`. |
| `hasActiveFilters` | `boolean` | `true` when at least one filter is active. |
| `activeFilterCount` | `number` | Count of active filters. Ranges count as 1. |
| `toQueryDto()` | `InferFilterState<TSchema>` | Current state as a backend-ready DTO. |
| `toSearchParams()` | `URLSearchParams` | Current state as URL search params. |

---

## Behavior details

### Empty value removal

Setting a filter to an empty value removes it from state:

```ts
bridge.set('search', '')       // search is removed
bridge.set('tags', [])         // tags is removed
bridge.set('amount', {})       // amount is removed
bridge.set('createdAt', { from: undefined, to: undefined }) // removed
```

This keeps `state` predictable — you never need `if (state.search !== '' && state.search !== undefined)`.

### `set(key, value)`

Updates one filter and preserves all others. Calls `onChange`.

```ts
bridge.set('search', 'invoice')
bridge.set('status', 'paid')
bridge.set('tags', ['urgent', 'review'])
bridge.set('active', true)
bridge.set('createdAt', { from: '2026-01-01', to: '2026-01-31' })
bridge.set('amount', { min: 100, max: 500 })
```

### `setMany(values)`

Merges multiple values in a single update. `onChange` is called only once.

```ts
bridge.setMany({ search: 'invoice', status: 'paid' })
```

### `clear(key)`

Removes a single filter. Preserves all others.

```ts
bridge.clear('status')
```

### `reset()`

Clears all filters to `{}`.

`reset()` means "clear everything", **not** "back to `initialState`". Use `resetToInitial()` for that.

```ts
bridge.reset()
// bridge.state === {}
```

### `resetToInitial()`

Restores the `initialState` passed at mount. Filters added since are removed.

```ts
const bridge = useFilterBridge(schema, { initialState: { status: 'paid' } })

bridge.set('search', 'invoice')
bridge.resetToInitial()
// bridge.state === { status: 'paid' }
```

`initialState` is captured once on the first render, so passing a different one later does not change what this restores — the hook stays uncontrolled. Fires `onChange` with the restored state.

### `syncState(state)`

Replaces the whole state with state that came from outside the component — browser history, a router, a server push.

It differs from the other mutators in two ways: it **replaces** instead of merging, and it does **not** fire `onChange`.

```ts
bridge.syncState({ search: 'invoice' })
// bridge.state === { search: 'invoice' } — any other filter is gone
// onChange was NOT called
```

Skipping `onChange` is what makes two-way URL sync safe. `onChange` normally writes state to the URL; `syncState` is called because the URL already changed. Firing it would write the value straight back and loop.

```tsx
import { parseFiltersFromUrl, pushUrlFilters } from '@filterbridge/browser'
import { usePopstateSync } from '@filterbridge/browser/react'

const bridge = useFilterBridge(schema, {
  initialState: parseFiltersFromUrl(schema),
  onChange: (state) => pushUrlFilters(schema, state),
})

usePopstateSync(schema, bridge.syncState)
```

### `hasActiveFilters` and `activeFilterCount`

Derived from current state. A `dateRange` or `numberRange` with any value set counts as one active filter.

```ts
// state = { search: 'invoice', status: 'paid', createdAt: { from: '...', to: '...' } }
bridge.activeFilterCount // 3
bridge.hasActiveFilters  // true
```

### `toQueryDto()` and `toSearchParams()`

Both delegate to `@filterbridge/core`. The result reflects the current state at the time of the call.

```ts
const dto = bridge.toQueryDto()
// { search: 'invoice', status: 'paid' }

const params = bridge.toSearchParams()
// URLSearchParams: search=invoice&status=paid

// Round-trip: parse back from URL
import { parseFilters } from '@filterbridge/core'
const reparsed = parseFilters(schema, bridge.toSearchParams())
// reparsed deep-equals bridge.state
```

---

## TypeScript types

The exported types for building your own abstractions:

```ts
import type { UseFilterBridgeOptions, UseFilterBridgeReturn } from '@filterbridge/react'
import type { FilterSchema, InferFilterState } from '@filterbridge/core'
```

`UseFilterBridgeReturn<TSchema>` is the full type of the object returned by `useFilterBridge`.

---

## Known limitations

- No URL synchronization in this hook — `useFilterBridge` manages in-memory state only. Use `@filterbridge/browser` for URL sync (including back/forward via `usePopstateSync` + `syncState`), or `@filterbridge/next` for Next.js App Router.
- `multiSelect` serializes via comma-separated values. Parsing also accepts repeated query params.
- No per-filter default values.
- No custom key suffixes for range fields.

---

## See also

- [`@filterbridge/core`](../core) — filter schema DSL and pure functions
- [`@filterbridge/browser`](../browser) — browser URL sync helpers
- [`@filterbridge/next`](../next) — Next.js App Router adapter
- [`docs/api/react.md`](../../docs/api/react.md) — detailed API reference
- [Root README](../../README.md) — project overview and React example
- [Demo app](../../apps/demo) — working example with all filter types
- [GitHub](https://github.com/gabpaesschulz/filterbridge)
