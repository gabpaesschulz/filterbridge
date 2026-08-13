---
'@filterbridge/react': minor
'@filterbridge/browser': minor
---

Add a way to push state into `useFilterBridge` from outside, and a `popstate` listener that uses it.
Back/forward navigation now restores the filter UI instead of leaving it out of sync with the URL.

`useFilterBridge` owned its state with no entry point: `initialState` was read once in a `useState`
initializer, and every mutation (`set`, `setMany`, `clear`, `reset`) came from inside the component.
Nothing listened for `popstate`, so pressing Back changed the address bar while the UI kept the old
filters — the two disagreed until a full reload.

- **`@filterbridge/react`** — new `syncState(state)` on the hook's return value. It replaces the
  whole state rather than merging, so a filter absent from the incoming state is removed from the
  UI. It deliberately does **not** fire `onChange`.
- **`@filterbridge/browser`** — new `usePopstateSync(schema, onState, options?)`, exported from a
  new `@filterbridge/browser/react` entry point. On each `popstate` it re-parses
  `window.location.search` with the schema and hands the result to `onState`. It does not fire on
  mount, removes its listener on unmount, and is a no-op when `window` is undefined.

```tsx
const bridge = useFilterBridge(orderFilters, {
  initialState: parseFiltersFromUrl(orderFilters),
  onChange: (state) => pushUrlFilters(orderFilters, state),
})

usePopstateSync(orderFilters, bridge.syncState)
```

**On `syncState` not firing `onChange`:** this is the invariant that makes the pairing safe, not an
implementation detail. `onChange` writes state to the URL; `syncState` is called *because* the URL
already changed. If it fired `onChange`, every Back press would immediately re-push the state the
user just navigated away from and the button would appear frozen. There is an explicit end-to-end
test for it.

**Packaging:** React is an **optional** peer dependency of `@filterbridge/browser`
(`peerDependenciesMeta.react.optional`). The root entry never imports React, so the package remains
importable in plain Node or any non-React app; only the `/react` subpath pulls React in.

Both additions are additive — no existing behavior changes. Note that back/forward only has
somewhere to go if filter changes are written with `pushUrlFilters`; `replaceUrlFilters` keeps a
single history entry.
