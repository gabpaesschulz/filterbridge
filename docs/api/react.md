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

##### `clear()` is how you express "not filtering"

This matters most for `boolean()` filters, which have **three** states, not two:

| State | Meaning | URL |
|---|---|---|
| `true` | Filter to archived rows | `archived=true` |
| `false` | Filter to non-archived rows | `archived=false` |
| `undefined` | Not filtering on this field at all | *(absent)* |

`set('archived', false)` is a real filter value and stays in the URL and the query DTO. Only
`clear('archived')` removes it.

A plain checkbox cannot express this — unchecking it writes `false`, so the filter can never return
to `undefined`. Bind booleans to a three-option control, or pair the checkbox with a clear button:

```tsx
<select
  value={bridge.state.archived === undefined ? '' : String(bridge.state.archived)}
  onChange={(e) => {
    if (e.target.value === '') bridge.clear('archived')
    else bridge.set('archived', e.target.value === 'true')
  }}
>
  <option value="">Any</option>
  <option value="true">Yes</option>
  <option value="false">No</option>
</select>
```

`activeFilterCount` counts `false` as active and `undefined` as inactive, for the same reason.

##### `clear()` does not survive a URL round trip for a filter with a schema default

A filter declared with a [`default`](./core.md#default-values) is absent from the URL precisely when
it is at its default — that is the whole point of the feature. Clearing it produces the same empty
query string, so the two are indistinguishable once state has been through the URL:

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
})

bridge.clear('status')
bridge.state // { }            — the control shows "no status"
bridge.toSearchParams().toString() // ''
parseFilters(schema, bridge.toSearchParams()) // { status: 'paid' } — back on reload
```

The hook is uncontrolled and does not consult schema defaults, so within the session `bridge.state`
and the URL genuinely disagree: the UI shows the filter cleared, a reload shows it at its default.
The same applies to [`reset()`](#reset), which clears to `{}` and therefore reloads as every
default.

This is the documented cost of omitting defaults from the URL, not a bug — but it means **a filter
whose "not filtering" state has to be reachable and shareable should not declare a default.** Model
the extra state as an explicit option instead:

```ts
// clear() is not durable here
archived: boolean({ default: false })

// 'all' is a real, linkable value
archived: select(['all', 'active', 'archived'], { default: 'active' })
```

---

#### `reset()`

```ts
reset: () => void
```

Clears all filters. State becomes `{}`.

`reset()` means "clear everything", not "back to `initialState`". To restore `initialState`, use [`resetToInitial()`](#resettoinitial).

```ts
bridge.reset()
// bridge.state === {}
```

Calls `onChange` with `{}`.

---

#### `resetToInitial()`

```ts
resetToInitial: () => void
```

Restores the `initialState` passed at mount. Filters that were not in `initialState` are removed, so this replaces the state rather than merging into it.

```ts
const bridge = useFilterBridge(schema, {
  initialState: { status: 'paid' },
})

bridge.set('search', 'invoice')
// bridge.state === { status: 'paid', search: 'invoice' }

bridge.resetToInitial()
// bridge.state === { status: 'paid' }
```

`initialState` is captured **once**, on the first render, and cleaned like any other state write — passing a different `initialState` on a later render does not change what `resetToInitial()` restores. This keeps the hook uncontrolled and matches how `initialState` already behaves for initialization.

Calls `onChange` with the restored state.

Which one to put behind a "Reset" button depends on where `initialState` comes from:

| `initialState` source | Meaning of `reset()` | Meaning of `resetToInitial()` |
|---|---|---|
| Nothing / hardcoded `{}` | Clear everything | Same as `reset()` |
| Hardcoded defaults (`{ status: 'paid' }`) | Show everything, unfiltered | Back to the page's default view |
| Parsed from the URL | Clear the shared link's filters | Back to the link the user arrived with |

---

#### `syncState(state)`

```ts
syncState: (state: Partial<InferFilterState<TSchema>>) => void
```

Replaces the whole state with externally-provided state. Use it when the state did not originate inside the component — browser history, a router, a server push.

Two properties distinguish it from the other mutators:

- It **replaces** rather than merges. Keys absent from the argument end up absent from the state. `syncState({})` clears everything.
- It does **not** fire `onChange`.

That second point is the whole reason the method exists. The usual `onChange` writes state back to the URL; `syncState` is called *because* the URL already changed. If it fired `onChange`, adopting a URL would immediately write it back, and a `popstate` handler would loop.

```ts
bridge.syncState({ search: 'invoice' })
// bridge.state === { search: 'invoice' }
// onChange was NOT called
```

Empty values are cleaned exactly as they are for `set` and `setMany`.

The typical pairing is with [`usePopstateSync`](./browser.md#usepopstatesyncschema-onstate-options) from `@filterbridge/browser/react`:

```tsx
const bridge = useFilterBridge(orderFilters, {
  initialState: parseFiltersFromUrl(orderFilters),
  onChange: (state) => pushUrlFilters(orderFilters, state),
})

usePopstateSync(orderFilters, bridge.syncState)
```

See the [URL sync guide](../guides/url-sync.md#backforward-navigation) for the full pattern.

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
  resetToInitial: () => void
  syncState: (state: Partial<InferFilterState<TSchema>>) => void
  hasActiveFilters: boolean
  activeFilterCount: number
  toQueryDto: () => InferFilterState<TSchema>
  toSearchParams: () => URLSearchParams
}
```

---

## Implementation notes

**State cleaning:** Empty values are removed from state on every update via `cleanFilterState`. This runs on initialization, on every `set`, `setMany`, `clear`, `reset`, `resetToInitial`, and `syncState` call.

**`onChange` timing:** `onChange` is called synchronously inside the `setState` callback. This avoids the double-fire that `useEffect` would cause in React Strict Mode. It fires on every update except `syncState`, and not on first render.

**`initialState` capture:** The cleaned `initialState` is stored in a ref on the first render and never updated. Both initialization and `resetToInitial()` read that single value.

**`onChange` reference:** The latest `onChange` is kept in a ref. You do not need to memoize the callback passed to `options.onChange` — updates to it are picked up without causing re-renders.

**Memoization:** `set`, `setMany`, `clear`, `reset`, `resetToInitial`, `syncState`, `toQueryDto`, and `toSearchParams` are all stable across renders (memoized with `useCallback`). `activeFilterCount` is memoized with `useMemo`.

**Schema stability:** The `schema` object should be defined outside the component. If you define it inside the component, wrap it in `useMemo` or move it to module scope to avoid unnecessary work on each render.
