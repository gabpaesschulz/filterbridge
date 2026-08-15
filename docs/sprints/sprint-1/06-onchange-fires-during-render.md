# Task 6 — `onChange` fires during the render phase

**Priority:** P1 — a React rules violation in the hook's main integration path
**Area:** `@filterbridge/react`
**Status:** open — **deferred to Sprint 2**, workaround documented

---

## How it was found

Not planned. [Task 4](./04-next-app-router-example.md) predicted this shape of outcome exactly:

> The real risk is that building it surfaces a bug in `@filterbridge/next` […] That is the point of
> the task. If it happens, stop, write it up as a new task, and decide whether it lands in this
> sprint or the next.

Building the example produced, on every filter change:

```txt
Cannot update a component (`Router`) while rendering a different component (`InvoicesClient`).
To locate the bad setState() call inside `InvoicesClient`, follow the stack trace…
```

## The defect

[`use-filter-bridge.ts:53-62`](../../../packages/react/src/use-filter-bridge.ts) calls the user's
`onChange` from inside the `setState` updater:

```ts
const updateState = useCallback(
  (updater: (current: State) => State) => {
    setState((current) => {
      const next = withDefaults(cleanFilterState(updater(current) as Record<string, unknown>))
      onChangeRef.current?.(next) // ← runs during the render phase
      return next
    })
  },
  [withDefaults]
)
```

React invokes state updaters during render, and requires them to be pure. The existing comment shows
the trade was made knowingly:

> Calling `onChange` inside the `setState` callback means it fires synchronously during each action
> (not via `useEffect`), which avoids the Strict Mode double-fire that effects would cause.

Avoiding the double-fire was a real goal. Putting a side effect in an updater is not the way to get
it, and it costs three things:

1. **Any `onChange` that updates React state warns and is unsafe.** `router.push` /
   `router.replace` are the obvious case, and they are what the Next.js guide tells people to write.
2. **The updater can run twice.** Strict Mode double-invokes updaters in development precisely to
   surface impurity, so `onChange` already fires twice there.
3. **The updater can run for a render that is thrown away.** Under a concurrent render React may
   discard the result, and `onChange` will have fired for state the user never saw.

`apps/demo` does not warn, which is why this survived two releases: `replaceUrlFilters` writes to
`window.history`, which is not a React state update. The impurity is identical; only the symptom is
missing.

## Decisions needed before implementing

### 1. Where does `onChange` move to?

| Option                                           | Trade-off                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A — `useEffect` on state                         | Idiomatic and safe. Fires on mount unless guarded, and Strict Mode double-invokes effects — the exact problem the current code was avoiding |
| B — compute next state outside `setState`        | Call `onChange` in the event handler, then `setState(next)` with a plain value. Needs the current state, so it needs a ref mirror           |
| C — `useEffect` guarded by a "last notified" ref | Fires once per real change, survives Strict Mode. One more piece of state to keep honest                                                    |

**Leaning B**, because it preserves the property the current code is right to want: `onChange` fires
once, synchronously, as part of the user's action — not a tick later. A ref mirroring state is a
small, well-understood cost. C is the fallback if B turns out to interact badly with `syncState`.

Whichever is chosen, the 80 existing tests in
[`use-filter-bridge.test.tsx`](../../../packages/react/src/__tests__/use-filter-bridge.test.tsx)
define the contract that must not move: `onChange` fires for `set`, `setMany`, `clear`, `reset`,
`resetToInitial`, and **not** for `syncState`.

### 2. Does it need a Strict Mode test?

Yes, and there is none today. Whatever lands should be asserted under
`<React.StrictMode>` with a count, because "fires exactly once per change" is the property that
broke and a test that renders without Strict Mode cannot see it.

### 3. Is it breaking?

Behaviorally no under option B — same callback, same argument, same moment. Under A or C the timing
moves from synchronous to post-commit, which is observable by anyone who reads state immediately
after calling `set()`. That difference decides whether this is a patch or a minor.

## Why it is deferred

Not because it is unimportant — it is the highest-priority item found this sprint. Because:

- it is **pre-existing**, shipped in `0.1.0` and unchanged since, so `0.3.0` is no worse than
  `0.2.0`;
- the fix changes `onChange` timing, which is the contract 80 tests describe, and that is a design
  decision deserving its own task rather than a hurried patch at the end of a release;
- the workaround is one line and is documented where someone hitting the warning will look.

Holding `0.3.0` for it would trade a shipped formatting fix, a shipped API addition and a shipped
accessibility fix against a warning that has a working mitigation.

## Workaround, until it is fixed

Defer the navigation out of the render phase:

```ts
onChange(nextState) {
  const href = createNextFilterHref(schema, nextState, { pathname, searchParams })
  queueMicrotask(() => router.push(href, { scroll: false }))
}
```

Applied in [`examples/next-app-router`](../../../examples/next-app-router/app/invoices-client.tsx)
and noted in [the guide](../../guides/next-app-router.md).

## Acceptance criteria

- [ ] `onChange` never runs during the render phase
- [ ] It fires exactly once per state change, asserted under `<React.StrictMode>`
- [ ] The existing 80 hook tests pass unmodified
- [ ] `syncState` still does not fire it
- [ ] `queueMicrotask` removed from the Next.js example and from the guide, and the example re-run
- [ ] An ADR if the timing changes observably

## Related

- [Task 4 — the Next.js example](./04-next-app-router-example.md) — how this was found
- [ADR-004 — external state sync](../../decisions/004-external-state-sync.md) — why `syncState` is
  exempt from `onChange`
