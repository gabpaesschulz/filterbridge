# Task 1 — `onChange` fires during the render phase

**Priority:** P1 — a React rules violation on the hook's main integration path
**Area:** `@filterbridge/react`
**Status:** done. Option B as recommended, with the mirror ref. Recorded in
[ADR-006](../../decisions/006-onchange-timing.md)
**Carried over from:** [Sprint 1 task 6](../sprint-1/06-onchange-fires-during-render.md), which has
the discovery story and is left unedited as the record of what was believed then

---

## The defect, in one paragraph

[`use-filter-bridge.ts:53-62`](../../../packages/react/src/use-filter-bridge.ts) calls the user's
`onChange` from inside the `setState` updater. React runs updaters during the render phase and
requires them to be pure. The consequences: an `onChange` that updates React state — `router.push`,
which is what [the Next.js guide](../../guides/next-app-router.md) tells people to write — warns and
is unsafe; the updater is double-invoked under `<React.StrictMode>`, so `onChange` already fires
twice in development; and under a concurrent render React may discard the result, having already
fired `onChange` for state the user never saw.

`apps/demo` does not warn, which is how this survived three releases: `pushUrlFilters` writes to
`window.history`, which is not a React state update. The impurity is identical; only the symptom is
absent.

---

## Re-evaluating the three options

Sprint 1 recorded a lean toward **B** and a condition for abandoning it: _"C is the fallback if B
turns out to interact badly with `syncState`."_ Reading the current code against all three changes
two things and confirms the third.

### What reading the code changed

**1. The `syncState` worry does not fire.** `syncState` already bypasses `updateState` entirely and
already calls `setState` with a plain value, not an updater. Under B it needs one extra line — write
the mirror ref — and under C it needs one extra line — write the "last notified" ref. The
interaction is symmetric and trivial in both. The recorded escape condition for B never triggers, so
the choice has to be made on other grounds.

**2. There is a variant of B that passes all 80 tests and is broken.** This is the important find.
The obvious way to write B is to read `state` from the render closure:

```ts
// BROKEN — do not ship this
const updateState = useCallback(
  (updater: (current: State) => State) => {
    const next = withDefaults(cleanFilterState(updater(state) as Record<string, unknown>))
    onChangeRef.current?.(next)
    setState(next)
  },
  [state, withDefaults]
)
```

Today's functional updater makes two mutator calls in one event handler compose: React queues both
updaters and runs them in order. The closure variant above does not — the second call reads the
`state` of the render it was created in, so `set('a', 1); set('b', 2)` in one handler loses the
first write.

**Every one of the 80 tests in
[`use-filter-bridge.test.tsx`](../../../packages/react/src/__tests__/use-filter-bridge.test.tsx)
wraps a single mutator call in its own `act()`.** There is no test anywhere in the repository that
calls two mutators inside one `act()`, so the suite cannot see this regression. That is a coverage
hole in the contract the sprint-1 file called "the contract that must not move", and it has to be
closed **before** the fix lands, not after — otherwise the guard is written by the same reasoning
that would have shipped the bug.

The viable B therefore carries a mirror ref, and the ref is not an optional refinement:

```ts
const stateRef = useRef(state)

const updateState = useCallback(
  (updater: (current: State) => State) => {
    const next = withDefaults(
      cleanFilterState(updater(stateRef.current) as Record<string, unknown>)
    )
    stateRef.current = next
    setState(next)
    onChangeRef.current?.(next)
  },
  [withDefaults]
)
```

**3. The rest of the sprint-1 analysis holds.** All five notifying mutators funnel through
`updateState`, so the change is confined to one function plus one line in `syncState`. Nothing else
in `@filterbridge/react` writes state.

### The options as they now stand

| Option                                             | How `onChange` fires                                                       | Verdict                                                                                                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** — `useEffect` on `state`                     | Post-commit, once per commit                                               | **Rejected.** Fires on mount unless guarded, and the guard it needs _is_ option C. A is C without the ref, and C without the ref is wrong                            |
| **B** — compute outside `setState`, mirror ref     | Synchronously, in the event handler, before the commit                     | **Recommended.** Preserves the current timing exactly. Costs a second source of truth that three call sites must keep honest                                         |
| **C** — `useEffect` guarded by a last-notified ref | Post-commit, once per real change, idempotent under Strict Mode re-entries | Viable and arguably more idiomatic. Costs an observable timing change and one semantic edge case (below). Correct by construction rather than by careful ref hygiene |

### Why B rather than C

**B preserves the contract; C changes it.** Under B, `onChange` still fires synchronously as part of
the user's action, with the same argument, before the re-render. Nothing about the observable
sequence moves. Under C it moves to after the commit — harmless for the URL write it exists for, but
it is a real change to a documented callback, and it means `onChange` can no longer be relied on to
have run before anything else in the same handler.

**C has an edge case B does not.** C compares `state` against a ref by identity, so a `set` and a
`syncState` batched into the same commit collapse into one comparison, the ref already matches the
final state, and the `set`'s notification is silently dropped. That is contrived, but "silently
dropped" is the failure mode this library has already been burned by once
([Sprint 0 task 1](../sprint-0/01-repeated-query-params.md)).

**The honest argument for C**, which should be weighed before B is committed to: C keeps React state
as the single source of truth, and it is correct by construction under concurrent rendering rather
than correct because three call sites remember to write a ref. Today those call sites are `useState`
initialization, `updateState` and `syncState` — three, countable, and the hook is explicitly meant
to stay small ([CLAUDE.md §9](../../../CLAUDE.md)). If the hook ever grows a fourth writer, B's cost
grows with it and the choice should be revisited.

**Recommendation: B, with the mirror ref, and with the batching test written first.** The recorded
lean survives re-examination — but for a partly different reason than the one recorded (the
`syncState` interaction turned out to be a non-issue in both directions), and with a trap the record
did not contain.

---

## Decisions needed before implementing

### Decision 1 — where does `onChange` move to?

B, C, or something else. See above. **Recommended: B.** This is the decision that determines whether
the release argument in [task 6](./06-release.md) needs a timing clause.

### Decision 2 — does `onChange` fire before or after `setState`?

Only live under B, and it does not affect the result — React 18 batches both into one commit either
way — but it should be chosen on purpose rather than by where the line landed.

**Recommended: after `setState`.** If `onChange` throws, the local state update has already been
queued, so the component and the URL disagree by one change rather than the state update being lost
entirely. That is the less confusing of the two failure modes, and it matches the mental model the
callback's name implies: the state changed, and then you were told.

### Decision 3 — what guards the batching property?

At minimum a test that calls two mutators inside one `act()` and asserts both writes survive.

Worth deciding at the same time: whether `onChange` should fire **twice** (once per mutator) or
**once** (with the final state) for two mutators in one handler. Under B and under today's code it
fires twice; under C it fires once. Whichever is chosen becomes documented behavior and needs an
assertion, because right now nothing states it and both readings are defensible.

**Recommended: twice, matching today.** `setMany` already exists as the "one notification for
several filters" affordance, and its dedicated test
(`setMany() > calls onChange only once`) is what makes that distinction meaningful.

### Decision 4 — how is Strict Mode asserted?

There is no test under `<React.StrictMode>` in the repository. `renderHook` accepts a `wrapper`, so
this is cheap; the decision is scope, not mechanism.

**Recommended:** re-run the `onChange` counting assertions under a Strict Mode wrapper — the ones
for `set`, `setMany`, `clear`, `reset`, `resetToInitial`, plus the `syncState` non-firing pair —
rather than duplicating all 80. Those are the tests that describe the property that broke. A
`describe.each` over `[undefined, StrictMode]` wrappers keeps it to one block.

Note that this decision is about the React 18 suite. Running the same assertions under React 19 is
[task 2](./02-react-version-matrix.md), and the two together are what make "fires exactly once"
mean something.

### Decision 5 — is it breaking, and does it need an ADR?

Under B the callback, its argument and its moment are unchanged for any consumer not running Strict
Mode; under Strict Mode it goes from twice to once, which is a fix nobody can reasonably have
depended on. That is a **minor**, and it is the version [task 6](./06-release.md) argues for anyway
because of task 3.

**An ADR is worth writing regardless of which option wins.** Not because the timing changed, but
because the current behavior was a deliberate, documented trade — the code comment says so — and the
next person to open the hook needs to find the reason it was reversed next to the reason it was
made. Under C the ADR is mandatory: the timing change is observable and needs a record.

---

## Acceptance criteria

- [ ] `onChange` never runs during the render phase
- [ ] A test calls two mutators inside one `act()` and asserts both writes survive — **written and
      passing against the current implementation before the fix is applied**
- [ ] `onChange` fires exactly once per state change, asserted under `<React.StrictMode>`
- [ ] The 80 existing tests in `use-filter-bridge.test.tsx` pass **unmodified**
- [ ] `syncState` still does not fire `onChange`, including under Strict Mode
- [ ] The `popstate` round-trip suite in `@filterbridge/browser` still passes — it is the end-to-end
      guard on ADR-004's no-loop invariant
- [ ] A changeset, spelling out the Strict Mode double-fire as a behavior change rather than burying
      it under "fix"
- [ ] An ADR recording why the original trade was reversed
- [ ] `queueMicrotask` removed from the example and the guide — [task 4](./04-live-surfaces.md)

---

## Related

- [Sprint 1 task 6](../sprint-1/06-onchange-fires-during-render.md) — how it was found, and the
  reasoning as it stood at `0.3.1`
- [Sprint 1 task 4](../sprint-1/04-next-app-router-example.md) — the example that surfaced it
- [ADR-004](../../decisions/004-external-state-sync.md) — why `syncState` is exempt from `onChange`,
  and why that exemption is load-bearing rather than incidental
- [Task 2](./02-react-version-matrix.md) — the React 19 half of "fires exactly once"
