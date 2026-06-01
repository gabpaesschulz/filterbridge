# FilterBridge — Basic Example

This example shows how to use `@filterbridge/core` and `@filterbridge/react` together.

No demo app is included yet — that comes in a future wave. The snippets below are copy-paste ready.

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
      <button onClick={() => bridge.set('tags', ['urgent', 'review'])}>
        Urgent + Review
      </button>

      {/* Date range */}
      <button
        onClick={() =>
          bridge.set('createdAt', { from: '2026-01-01', to: '2026-01-31' })
        }
      >
        January 2026
      </button>

      {/* Number range */}
      <button onClick={() => bridge.set('amount', { min: 100, max: 500 })}>
        $100 – $500
      </button>

      {/* Reset */}
      <button onClick={() => bridge.reset()}>Reset all</button>

      {/* Active filter count */}
      {bridge.hasActiveFilters && (
        <span>{bridge.activeFilterCount} active filters</span>
      )}

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

## 5. Type inference

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

---

## Coming next

A visual demo app (Wave 4) will show filters wired to a mock data table with active filter chips, URL sync, and a live DTO preview.
