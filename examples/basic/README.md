# FilterBridge — Basic Example

Copy-paste snippets for `@filterbridge/core` and `@filterbridge/react`.

For a running application instead of snippets, see the demo: [live](https://filterbridge-demo.vercel.app),
source in [`apps/demo`](../../apps/demo), or `pnpm demo` from the repository root. It wires all six
filter types to a TanStack table with URL sync and a live DTO preview.

---

## 1. Define a schema

```ts
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  select,
  text,
} from '@filterbridge/core'

export const orderFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review', 'archived'] as const),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})
```

`select`, `multiSelect` and `boolean` can declare a default — the filters whose value space is a
fixed set. A filter sitting at its default emits no query param, and `parseFilters` puts the default
back when the param is absent:

```ts
import { getDefaultFilterState } from '@filterbridge/core'

export const orderFilters = defineFilters({
  status: select(['pending', 'paid', 'failed'] as const, { default: 'pending' }),
  archived: boolean({ default: false }),
})

getDefaultFilterState(orderFilters)
// { status: 'pending', archived: false }
```

`text()`, `dateRange()` and `numberRange()` take no configuration — passing a default is a type
error. See [which filters accept a default](../../docs/api/core.md#which-filters-accept-a-default).

Note that `clear()` on a filter with a default returns it to that default rather than removing it:
there is no "absent" state for it to return to, because an omitted param _is_ the default.

---

## 2. Use in React

```tsx
import { useFilterBridge } from '@filterbridge/react'
import { orderFilters } from './filters'

export function OrdersFilters() {
  const bridge = useFilterBridge(orderFilters, {
    initialState: {
      search: 'invoice',
      status: 'paid',
    },
    onChange(state) {
      console.log('filters changed', state)
    },
  })

  return (
    <div>
      {/* Text input */}
      <input
        value={bridge.state.search ?? ''}
        onChange={(e) => bridge.set('search', e.target.value)}
        placeholder="Search..."
      />

      {/* Select buttons */}
      <button onClick={() => bridge.set('status', 'paid')}>Paid</button>
      <button onClick={() => bridge.set('status', 'pending')}>Pending</button>
      <button onClick={() => bridge.clear('status')}>Clear status</button>

      {/* Multi-select */}
      <button onClick={() => bridge.set('tags', ['urgent', 'review'])}>Urgent + Review</button>

      {/* Date range */}
      <button onClick={() => bridge.set('createdAt', { from: '2026-01-01', to: '2026-01-31' })}>
        January 2026
      </button>

      {/* Number range */}
      <button onClick={() => bridge.set('amount', { min: 100, max: 500 })}>$100 – $500</button>

      {/* Reset: back to the baseline, or back to the initial state */}
      <button onClick={() => bridge.reset()}>Reset all</button>
      <button onClick={() => bridge.resetToInitial()}>Back to start</button>

      {/* Active filter count */}
      {bridge.hasActiveFilters && <span>{bridge.activeFilterCount} active filters</span>}

      {/* Backend DTO */}
      <pre>{JSON.stringify(bridge.toQueryDto(), null, 2)}</pre>

      {/* URL params */}
      <pre>{bridge.toSearchParams().toString()}</pre>
    </div>
  )
}
```

---

## 3. Use core functions directly (no React)

```ts
import { parseFilters, toQueryDto, toSearchParams } from '@filterbridge/core'
import { orderFilters } from './filters'

// Parse from URL
const url = new URL('https://app.example.com/orders?search=invoice&status=paid&amountMin=100')
const state = parseFilters(orderFilters, url.searchParams)
// { search: 'invoice', status: 'paid', amount: { min: 100 } }

// Serialize back
const params = toSearchParams(orderFilters, state)
// URLSearchParams: search=invoice&status=paid&amountMin=100

// Build backend DTO
const dto = toQueryDto(orderFilters, state)
// { search: 'invoice', status: 'paid', amount: { min: 100 } }
```

Repeated params work too — `tags=urgent&tags=review` and `tags=urgent,review` parse the same way.

---

## 4. setMany — bulk update

```ts
bridge.setMany({
  search: 'receipt',
  status: 'failed',
  tags: ['urgent'],
})
// onChange is called once with the merged state
```

---

## 5. Keep the URL in sync

```tsx
import { parseFiltersFromUrl, pushUrlFilters } from '@filterbridge/browser'
import { usePopstateSync } from '@filterbridge/browser/react'

const bridge = useFilterBridge(orderFilters, {
  initialState: parseFiltersFromUrl(orderFilters),
  onChange: (state) => pushUrlFilters(orderFilters, state),
})

// Back/forward restores the filter UI from the URL.
usePopstateSync(orderFilters, bridge.syncState)
```

See [`docs/guides/url-sync.md`](../../docs/guides/url-sync.md) for the full picture, and
[`docs/guides/next-app-router.md`](../../docs/guides/next-app-router.md) for the Next.js equivalent.

---

## 6. Type inference

```ts
import type { InferFilterState } from '@filterbridge/core'

type OrderState = InferFilterState<typeof orderFilters>
// {
//   search?: string
//   status?: 'pending' | 'paid' | 'failed'
//   tags?: Array<'urgent' | 'review' | 'archived'>
//   active?: boolean
//   createdAt?: { from?: string; to?: string }
//   amount?: { min?: number; max?: number }
// }
```
