---
'@filterbridge/react': minor
---

Add `resetToInitial()` to `useFilterBridge`, and settle what `reset()` means.

`reset()` clears everything and always has — the implementation and `docs/api/react.md` agreed on
that, while CLAUDE.md §9 described it as "returns to initial/default state". The published behavior
is unchanged; the spec was corrected to match it, and the capability the spec was describing now
exists under its own name.

- **`reset()`** — clears all filters. State becomes `{}`. No change.
- **`resetToInitial()`** — restores the `initialState` passed at mount. It replaces rather than
  merges, so filters added since are removed.

```tsx
const bridge = useFilterBridge(orderFilters, {
  initialState: parseFiltersFromUrl(orderFilters),
})

bridge.reset()          // {} — show everything
bridge.resetToInitial() // back to the filters the shared link arrived with
```

`initialState` is captured once, on the first render, and cleaned exactly like every other state
write. Passing a different `initialState` on a later render does not change what `resetToInitial()`
restores — the hook stays uncontrolled, consistent with how `initialState` already worked for
initialization. Like the other mutators, it fires `onChange`.

Additive: no existing behavior changes, and `docs/api/react.md` no longer has to suggest
`setMany(initialState)` as a workaround.
