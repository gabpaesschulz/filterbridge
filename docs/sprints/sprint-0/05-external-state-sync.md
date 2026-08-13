# Task 5 — Hook cannot be synchronized from outside

**Priority:** P1 — API gap, visible in the published demo
**Area:** `@filterbridge/react`, `@filterbridge/browser`
**Status:** done — implemented as **A + D** (`syncState` + `usePopstateSync` behind
`@filterbridge/browser/react`)

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record).Accurate as written.

---

## Problem

`useFilterBridge` owns its state and offers no way to push a new state in from outside. The only
mutations are `set`, `setMany`, `clear`, and `reset`, all driven from inside the component
([`packages/react/src/use-filter-bridge.ts:39-66`](../../../packages/react/src/use-filter-bridge.ts)).
`initialState` is read exactly once, inside a `useState` initializer
([`use-filter-bridge.ts:22-25`](../../../packages/react/src/use-filter-bridge.ts)), so later changes
to it are ignored by design.

The visible consequence: **the browser's back button does nothing.** The demo writes every change
to the URL via `replaceUrlFilters`
([`apps/demo/src/App.tsx:12-17`](../../../apps/demo/src/App.tsx)), but nothing listens for
`popstate`, so navigating back changes the address bar while the UI keeps the old filters. The two
disagree until a full reload.

This is listed as known limitation #2 in
[`docs/releases/v0.1.0.md:84`](../../releases/v0.1.0.md) and as a roadmap item at
[`docs/roadmap.md:14`](../../roadmap.md). It is promoted to a sprint task because it is
reproducible on the deployed demo, which is the project's main showcase.

## Scope note

Next.js App Router is not affected in the same way: back/forward re-runs the server component,
which re-parses `searchParams` and remounts with correct state. This task is about
`@filterbridge/browser` + the generic React hook.

## Decision needed before implementing

Two independent choices.

### 1. How does external state enter the hook?

| Option | Shape | Trade-off |
|--------|-------|-----------|
| A — `syncState(next)` method | New method on the return object that replaces state without firing `onChange` | Smallest change; keeps the hook uncontrolled; caller must avoid feedback loops |
| B — controlled mode | Optional `state` + `onStateChange` props, like a controlled input | Most flexible and familiar; doubles the hook's surface and its documentation |
| C — `key` remount | Document remounting the component on navigation | Zero new API; loses focus and any unrelated local state on every back/forward |

**Recommendation: A.** It solves the actual problem with one method, keeps the hook small
(CLAUDE.md §9: "Keep the hook small"), and does not fork the hook into two modes. B can be added
later without breaking A. The `onChange`-suppression detail matters: `syncState` must **not** call
`onChange`, or a `popstate` handler that writes back to the URL will loop.

### 2. Where does the `popstate` listener live?

| Option | Trade-off |
|--------|-----------|
| D — `usePopstateSync(schema, onState)` in `@filterbridge/browser` | Natural home — the package already owns URL reading. But it currently has no React dependency, and adding a hook makes React a peer dependency of a package documented as framework-agnostic |
| E — option on `useFilterBridge` | Puts browser-specific behavior in the generic React hook, which CLAUDE.md §9 explicitly forbids |
| F — document the pattern, ship no listener | Zero API cost; every user writes the same ten lines |

**Recommendation: D**, with React as an *optional* peer dependency and the hook in a separate entry
point so the core browser functions stay importable without React. E is ruled out by the project's
own rules. F is acceptable as a stopgap if D's packaging cost is judged too high for `0.1.x`.

Confirm both decisions before writing code — this is the only task in the sprint that adds public
API surface to two packages at once.

## Decisions taken

Both confirmed before implementation:

- **A** — `syncState(next)` on the hook's return value. Replaces state, does not fire `onChange`.
- **D** — `usePopstateSync(schema, onState, options?)` in `@filterbridge/browser`, behind a new
  `@filterbridge/browser/react` entry point, with React as an *optional* peer dependency
  (`peerDependenciesMeta.react.optional`). The root entry never imports React.

The demo also moved from `replaceUrlFilters` to `pushUrlFilters` in `onChange` — `replaceState`
leaves a single history entry, so there was nothing for Back to navigate to. The trade-off (one
history entry per keystroke) and the alternatives are documented in
[`docs/guides/url-sync.md`](../../guides/url-sync.md#choosing-push-vs-replace).

## Acceptance criteria

- [x] `useFilterBridge` exposes a way to accept externally-provided state
- [x] That path does **not** fire `onChange` (no write-back loop)
- [x] Back/forward in the demo restores the filter UI to match the URL, without a reload —
      verified against the built demo in Chromium: input matches the URL after back and after
      forward, `0` page loads
- [x] The listener is SSR-safe and a no-op when `window` is undefined, matching the rest of
      `@filterbridge/browser`
- [x] The listener is removed on unmount
- [x] `@filterbridge/browser` remains importable in a non-React environment
- [x] Tests: `popstate` updates state; `onChange` is not called during sync; unmount removes the
      listener
- [x] Limitation removed from [`docs/releases/v0.1.0.md`](../../releases/v0.1.0.md), roadmap item
      checked, [`docs/guides/url-sync.md`](../../guides/url-sync.md) updated with the pattern

## Result

439 tests passing (was 299 at sprint baseline; +40 from this task). `lint`, `typecheck`, and
`build` clean. Changeset: `.changeset/external-state-sync.md` (`minor` — see
[task 10](./10-regression-tests-and-release.md) on `0.1.1` vs `0.2.0`).

New tests:

| File | Covers |
|------|--------|
| `packages/react/src/__tests__/use-filter-bridge.test.tsx` | `syncState` replaces, cleans, does not fire `onChange`, stable identity |
| `packages/browser/src/tests/use-popstate-sync.test.tsx` | subscribe/unsubscribe, event-time URL read, `enabled`, ref-based re-subscription |
| `packages/browser/src/tests/use-popstate-sync.ssr.test.tsx` | node environment: server render does not throw, root entry has no React |
| `packages/browser/src/tests/popstate-round-trip.test.tsx` | end-to-end back/forward against a fake history — the no-loop invariant |

## Risk

Medium. Additive to the public API, so not breaking on its own — but a state-sync path plus an
`onChange` write-back is exactly the shape that produces infinite loops. The "sync does not fire
`onChange`" rule is the invariant that prevents it, and it needs an explicit test, not just a
comment.

## Related

- [Task 6 — reset semantics](./06-reset-semantics.md) — also touches the hook's state lifecycle
- [Task 8 — demo fixes](./08-demo-fixes.md) — the demo is where this is verified
