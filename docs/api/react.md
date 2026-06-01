# @filterbridge/react — API Reference

Full API reference for the React package.

See [`packages/react/README.md`](../../packages/react/README.md) for a shorter usage-oriented overview.

---

## `useFilterBridge(schema, options?)`

```ts
function useFilterBridge<TSchema extends FilterSchema>(
  schema: TSchema,
  options?: UseFilterBridgeOptions<TSchema>
): UseFilterBridgeReturn<TSchema>
```

A React hook that manages local filter state for a FilterBridge schema.

### Parameters

#### `schema`

A filter schema created with `defineFilters` from `@filterbridge/core`.

```ts
import { defineFilters, multiSelect, text } from '@filterbridge/core'

const schema = defineFilters({
  search: text(),
  status: multiSelect(['pending', 'paid', 'failed']),
})
```

The schema object should be defined outside the component to maintain a stable reference and avoid unnecessary re-renders.

#### `options`

Optional. An object with the following properties:

**`initialState`** — `Partial<InferFilterState<TSchema>>`

Initial filter values. Applied once on first render. Empty values (empty string, empty array, empty object) are cleaned automatically.

```ts
useFilterBridge(schema, {
  initialState: {
    search: 'invoice',
    status: ['paid'],
  },
})
```

**`onChange`** — `(state: InferFilterState<TSchema>) => void`

Called after every state change. Not called on first render.

The most common use is triggering a data fetch:

```ts
useFilterBridge(schema, {
  onChange(state) {
    const dto = toQueryDto(schema, state)
    fetchOrders(dto)
  },
})
```

`onChange` always receives the cleaned state — empty values are never present.

---

### Return value

#### `state`

```ts
state: InferFilterState<TSchema>
```

Current filter state. Keys with empty values (`undefined`, `''`, `[]`, `{}`) are never present. Reading `state.search` returns `string | undefined` — you never need to check for empty string separately.

---

#### `set(key, value)`

```ts
set: <TKey extends keyof InferFilterState<TSchema>>(
  key: TKey,
  value: InferFilterState<TSchema>[TKey]
) => void
```

Updates a single filter. Setting a filter to an empty value removes it from state.

```ts
bridge.set('search', 'invoice')    // sets search
bridge.set('search', '')           // removes search
bridge.set('tags', ['paid'])       // sets tags
bridge.set('tags', [])             // removes tags
bridge.set('amount', { min: 100 }) // sets amount
bridge.set('amount', {})           // removes amount
```

Calls `onChange` after the update.

---

#### `setMany(values)`

```ts
setMany: (values: Partial<InferFilterState<TSchema>>) => void
```

Updates multiple filters in a single operation. `onChange` is called once with the merged result.

```ts
bridge.setMany({
  search: 'invoice',
  status: 'paid',
  amount: { min: 100, max: 500 },
})
```

---

#### `clear(key)`

```ts
clear: <TKey extends keyof InferFilterState<TSchema>>(key: TKey) => void
```

Removes a single filter from state. Equivalent to `set(key, undefined)`.

```ts
bridge.clear('status')
```

---

#### `reset()`

```ts
reset: () => void
```

Clears all filters. State becomes `{}`.

Note: `reset()` clears to an empty state, not to `initialState`. If you need to restore `initialState`, call `setMany(initialState)` manually.

```ts
bridge.reset()
// bridge.state === {}
```

---

#### `hasActiveFilters`

```ts
hasActiveFilters: boolean
```

`true` when at least one filter is active (has a non-empty value in state).

Useful for rendering a "clear all" button or an active filter indicator:

```tsx
{bridge.hasActiveFilters && (
  <button onClick={() => bridge.reset()}>Clear all filters</button>
)}
```

---

#### `activeFilterCount`

```ts
activeFilterCount: number
```

The number of active filters. Each key in state counts as one, regardless of how many values it contains. A `dateRange` with both `from` and `to` set counts as 1.

---

#### `toQueryDto()`

```ts
toQueryDto: () => InferFilterState<TSchema>
```

Returns the current state as a backend-ready DTO, delegating to `toQueryDto` from `@filterbridge/core`. Empty values are stripped.

The result is memoized and only recomputed when `state` changes.

```ts
const dto = bridge.toQueryDto()
// safe to pass to fetch/axios/ky
await api.getOrders(dto)
```

---

#### `toSearchParams()`

```ts
toSearchParams: () => URLSearchParams
```

Returns the current state as `URLSearchParams`, delegating to `toSearchParams` from `@filterbridge/core`. Output is deterministic.

The result is memoized and only recomputed when `state` changes.

```ts
const params = bridge.toSearchParams()
params.toString()
// search=invoice&status=paid&...
```

Round-trip example:

```ts
import { parseFilters } from '@filterbridge/core'

// serialize
const params = bridge.toSearchParams()

// restore
const reparsed = parseFilters(schema, params)
// deep-equals bridge.state
```

---

## Types

### `UseFilterBridgeOptions<TSchema>`

```ts
type UseFilterBridgeOptions<TSchema extends FilterSchema> = {
  initialState?: Partial<InferFilterState<TSchema>>
  onChange?: (state: InferFilterState<TSchema>) => void
}
```

---

### `UseFilterBridgeReturn<TSchema>`

```ts
type UseFilterBridgeReturn<TSchema extends FilterSchema> = {
  state: InferFilterState<TSchema>
  set: <TKey extends keyof InferFilterState<TSchema>>(
    key: TKey,
    value: InferFilterState<TSchema>[TKey]
  ) => void
  setMany: (values: Partial<InferFilterState<TSchema>>) => void
  clear: <TKey extends keyof InferFilterState<TSchema>>(key: TKey) => void
  reset: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  toQueryDto: () => InferFilterState<TSchema>
  toSearchParams: () => URLSearchParams
}
```

---

## Implementation notes

**State cleaning:** Empty values are removed from state on every update via `cleanFilterState`. This runs on initialization, on every `set`, `setMany`, `clear`, and `reset` call.

**`onChange` timing:** `onChange` is called synchronously inside the `setState` callback. This avoids the double-fire that `useEffect` would cause in React Strict Mode. It fires on every update, not on first render.

**`onChange` reference:** The latest `onChange` is kept in a ref. You do not need to memoize the callback passed to `options.onChange` — updates to it are picked up without causing re-renders.

**Memoization:** `set`, `setMany`, `clear`, `reset`, `toQueryDto`, and `toSearchParams` are all stable across renders (memoized with `useCallback`). `activeFilterCount` is memoized with `useMemo`.

**Schema stability:** The `schema` object should be defined outside the component. If you define it inside the component, wrap it in `useMemo` or move it to module scope to avoid unnecessary work on each render.
