# ADR-006: `onChange` fires from the event handler, not from the `setState` updater

**Date:** 2026-08-18
**Status:** accepted
**Amends:** [ADR-004](./004-external-state-sync.md), which relies on `syncState` bypassing the
notification path. That bypass is unchanged; only where the notification happens has moved.

## Context

From `0.1.0` to `0.3.1`, `useFilterBridge` called the user's `onChange` from inside its `setState`
updater:

```ts
setState((current) => {
  const next = withDefaults(cleanFilterState(updater(current)))
  onChangeRef.current?.(next) // ← runs during the render phase
  return next
})
```

The trade was deliberate and documented in the code:

> Calling `onChange` inside the `setState` callback means it fires synchronously during each action
> (not via `useEffect`), which avoids the Strict Mode double-fire that effects would cause.

The goal was right. The mechanism was not: React invokes state updaters during the render phase and
requires them to be pure, so this bought synchronous notification by putting a side effect where
React does not allow one. It cost three things.

**1. An `onChange` that updates React state warns and is unsafe.** `router.push` and
`router.replace` are the obvious case, and they are what
[the Next.js guide](../guides/next-app-router.md) tells people to write:

```txt
Cannot update a component (`Router`) while rendering a different component (`InvoicesClient`).
```

**2. The updater ran twice.** Strict Mode double-invokes updaters precisely to surface impurity, so
`onChange` already fired twice in development.

**3. It could notify for a render React discarded.** Under a concurrent render the result may be
thrown away, with `onChange` already fired for state the user never saw.

None of this was visible in `apps/demo`, which is why it survived three releases: the demo's
`onChange` calls `pushUrlFilters`, which writes to `window.history` rather than to React state. The
impurity was identical; only the symptom was absent.

It surfaced when [`examples/next-app-router`](../../examples/next-app-router) was built in Sprint 1,
and shipped in `0.3.1` unfixed behind a documented `queueMicrotask` workaround.

## Decision

Compute the next state in the caller's event handler and hand it to `setState` as a plain value.
`onChange` is called there, immediately after `setState` is queued.

```ts
const updateState = useCallback(
  (updater: (current: State) => State) => {
    const next = withDefaults(cleanFilterState(updater(stateRef.current)))
    stateRef.current = next
    setState(next)
    onChangeRef.current?.(next)
  },
  [withDefaults]
)
```

**The observable contract does not change.** `onChange` still fires synchronously as part of the
user's action, with the same argument, before the re-render — outside Strict Mode, no consumer can
tell the difference. Under Strict Mode it goes from twice to once.

## Options considered

| Option                                            | Where `onChange` fires                                 | Outcome                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| A — `useEffect` on `state`                        | Post-commit, once per commit                           | Rejected. Fires on mount unless guarded, and the guard it needs _is_ option C                                       |
| **B — compute outside `setState`, mirror ref** ✅ | Synchronously, in the event handler, before the commit | Chosen                                                                                                              |
| C — `useEffect` guarded by a last-notified ref    | Post-commit, once per real change                      | Viable. Rejected on the two grounds below, and it is the documented fallback if the hook grows a third state writer |

Sprint 1 recorded a lean toward B with an escape condition — "C is the fallback if B turns out to
interact badly with `syncState`". Re-reading the code before implementing showed that condition
never triggers: `syncState` already bypasses the shared path and already calls `setState` with a
plain value, so it costs one extra line under B (write the mirror) and one extra line under C (write
the last-notified ref). The choice had to be made on other grounds.

**Why B rather than C.** B preserves the contract; C moves `onChange` to after the commit, which is
observable by anyone reading state that `onChange` wrote later in the same handler. And C compares
state to a ref by identity, so a `set` and a `syncState` batched into one commit collapse into a
single comparison and the `set`'s notification is silently dropped — a contrived case, but silent
loss is a failure mode this project has already paid for once
([Sprint 0 task 1](../sprints/sprint-0/01-repeated-query-params.md)).

**The honest cost of B**, recorded so the next person does not have to rediscover it: React state is
no longer the single source of truth for computing an update. `stateRef` is written in exactly two
places, `updateState` and `syncState`, each immediately beside its `setState`. A third writer added
without updating it would let `onChange` report a state the hook never held. If that ever happens,
switch to C rather than adding a third mirror write — the code comment in `use-filter-bridge.ts`
says so.

## The trap this decision nearly walked into

The obvious way to write B is to read `state` from the render closure instead of from a ref:

```ts
const updateState = useCallback(
  (updater) => {
    const next = withDefaults(cleanFilterState(updater(state))) // ← wrong
    onChangeRef.current?.(next)
    setState(next)
  },
  [state, withDefaults]
)
```

The functional updater it replaces makes two mutator calls in one handler compose — React queues
both and runs them in order. The closure version does not: the second call reads the state of the
render it was created in, so `set('a', 1); set('b', 2)` loses the first write.

**All 80 tests in `use-filter-bridge.test.tsx` wrap a single mutator in its own `act()`**, so the
suite could not see it. The batching assertions in
[`update-path.test.tsx`](../../packages/react/src/__tests__/update-path.test.tsx) were written and
run against the old implementation first, for exactly this reason.

## Consequences

- The `queueMicrotask` workaround is removed from the Next.js guide and from
  `examples/next-app-router`. Navigating from `onChange` is now the plain thing it always looked
  like.
- `syncState` still does not fire `onChange`. ADR-004's no-loop invariant is untouched, and is
  asserted under Strict Mode as well as outside it.
- Strict Mode is now part of the test suite. "Fires exactly once per change" is not observable
  without it, which is how the double-fire lasted three releases.
- A detail worth keeping: React's eager-state path runs the updater in the event handler when the
  fiber has no pending update, so the **first** change after mount was accidentally safe under the
  old code. A test that clicks once passes against the broken version; the guard clicks twice.
