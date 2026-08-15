# ADR-004: External state sync via `syncState`, not a controlled mode

**Date:** 2026-08-13
**Status:** accepted

## Context

`useFilterBridge` owned its state with no way in. `initialState` was read once inside a `useState`
initializer, and every mutation came from inside the component. The visible consequence was that the
browser's Back button did nothing: the demo wrote every change to the URL, nothing listened for
`popstate`, and after navigating back the address bar and the UI disagreed until a full reload.

Two independent questions had to be answered: how does external state get in, and where does the
`popstate` listener live.

## Decision 1 — `syncState(next)`, not a controlled mode

| Option                       | Shape                                                       | Why not                                                                                                          |
| ---------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **A — `syncState(next)`** ✅ | One method that replaces state                              | chosen                                                                                                           |
| B — controlled mode          | Optional `state` + `onStateChange`, like a controlled input | Most flexible, but doubles the hook's surface and forks it into two modes that both need documenting and testing |
| C — `key` remount            | Document remounting on navigation                           | No new API, but loses focus and any unrelated local state on every back/forward                                  |

**A**, because it solves the actual problem with one method, keeps the hook small (CLAUDE.md §9),
and does not fork it. B remains addable later without breaking A; A does not foreclose it.

## Decision 2 — the listener lives in `@filterbridge/browser/react`

| Option                                                  | Why not                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **D — `usePopstateSync` in `@filterbridge/browser`** ✅ | chosen                                                                                          |
| E — an option on `useFilterBridge`                      | Puts browser-specific behavior in the generic React hook, which CLAUDE.md §9 explicitly forbids |
| F — document the pattern, ship nothing                  | Zero API cost, but every user writes the same ten lines and gets the `onChange` detail wrong    |

**D**, with React as an **optional** peer dependency and the hook behind a separate entry point, so
the root entry stays importable without React. That packaging is what makes D acceptable: the
package is documented as framework-agnostic, and adding a React hook to its root entry would have
made that false.

Verified rather than asserted — `.smoke/` imports both entries in ESM and CJS, and the root entry is
additionally imported in a project with no React installed.

## The invariant: `syncState` must not fire `onChange`

This is the load-bearing part, and it reads like an implementation detail, which is why it is
recorded here.

`onChange` writes filter state to the URL. `syncState` is called _because_ the URL already changed.
If `syncState` fired `onChange`, the pairing below would feed itself: every Back press would
re-push the entry the user had just navigated away from, and the button would appear frozen.

```tsx
const bridge = useFilterBridge(orderFilters, {
  initialState: parseFiltersFromUrl(orderFilters),
  onChange: (state) => pushUrlFilters(orderFilters, state),
})

usePopstateSync(orderFilters, bridge.syncState)
```

`syncState` therefore bypasses the shared `updateState` path deliberately. That is not an
optimisation and not an oversight — it is the whole reason the two functions can be used together.

There is an end-to-end test for it, and [ADR-003](./003-test-resolution.md) exists because that test
spent a while not actually testing it.

## Consequences

- `syncState` replaces rather than merges. A filter absent from the incoming state is removed from
  the UI, which is what "adopt this URL" has to mean.
- Since [ADR-002](./002-default-values.md), `syncState` also layers the schema defaults, so
  `syncState({})` adopts the defaults rather than an unreachable empty state.
- Back/forward only has somewhere to go if changes are written with `pushUrlFilters`;
  `replaceUrlFilters` keeps a single history entry. The demo moved to `pushUrlFilters` for this
  reason, accepting one history entry per change.
- Next.js App Router is unaffected: back/forward re-runs the server component, which re-parses
  `searchParams` and remounts with correct state.

## If a controlled mode is added later

Add it alongside `syncState`, not instead of it. The uncontrolled hook plus one escape hatch is the
common case; a controlled mode is for callers who already own the state elsewhere. Removing
`syncState` to make room would break the `usePopstateSync` pairing, which is the reason it exists.
