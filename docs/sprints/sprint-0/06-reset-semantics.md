# Task 6 — `reset()` semantics diverge from the spec

**Priority:** P1 — documentation/spec conflict
**Area:** `@filterbridge/react`, docs
**Status:** done — implemented as **B** (`reset()` unchanged + new `resetToInitial()`)

---

## Problem

Three sources of truth disagree about what `reset()` does.

| Source | Says |
|--------|------|
| [`CLAUDE.md` §9](../../../CLAUDE.md) | "`reset()` — returns to initial/default state" |
| [`docs/api/react.md:149`](../../api/react.md) | "`reset()` clears to an empty state, not to `initialState`" |
| [`use-filter-bridge.ts:64-66`](../../../packages/react/src/use-filter-bridge.ts) | `updateState(() => ({} as State))` — clears to empty |

The implementation and the API docs agree with each other; the project spec does not. A test pins
the current behavior explicitly — `'resets to empty state even if initialState was provided'`
([`packages/react/src/__tests__/use-filter-bridge.test.tsx:292`](../../../packages/react/src/__tests__/use-filter-bridge.test.tsx)) —
so this is a deliberate implementation choice that was never reflected back into the spec.

## Why it matters

The word "reset" carries an expectation, and the two readings produce opposite results for the most
common real setup — the demo's, where `initialState` comes from the URL
([`apps/demo/src/App.tsx:12-17`](../../../apps/demo/src/App.tsx)):

- **"Clear everything"** → the user lands on `/invoices?status=paid` from a shared link, clicks
  Reset, and sees all invoices.
- **"Back to how I found it"** → same link, clicks Reset, and returns to `status=paid`.

Both are defensible. Shipping the spec saying one and the code doing the other is not, and the
`docs/api/react.md` note reads as a caveat someone wrote after being surprised by it.

## Decision needed before implementing

| Option | Change | Trade-off |
|--------|--------|-----------|
| A — keep `reset()` empty, fix the spec | Amend CLAUDE.md §9 to match reality | Zero code risk; "reset to initial" stays unavailable without manual `setMany(initialState)` |
| B — keep `reset()` empty, add `resetToInitial()` | Both behaviors, unambiguous names | One new method; two similarly-named methods to document and explain |
| C — change `reset()` to restore `initialState` | Matches CLAUDE.md and the common reading of the word | **Breaking change on published code**; needs a `clearAll()` for the old behavior; existing test must be inverted |

**Recommendation: B.** `reset()` keeps its published meaning, so nothing breaks, and the missing
capability gets an explicit name rather than the workaround currently suggested in
[`docs/api/react.md:149`](../../api/react.md). Then amend CLAUDE.md §9 to describe both.

Option C is the only one that requires a major-ish version bump, and "reset" is not ambiguous enough
to justify breaking published behavior over.

## Implementation note

Whichever option wins, `initialState` currently exists only inside a `useState` initializer and is
not retained. `resetToInitial()` needs it captured in a ref at mount — deliberately *not* tracking
later changes to the prop, so the hook stays uncontrolled and consistent with how `initialState` is
documented today.

This interacts with [task 7](./07-filter-defaults.md): once filters can declare defaults, "reset"
has a third possible meaning — back to *schema* defaults, which is not the same as back to
`initialState`. Settle task 7's design first, or `resetToInitial()` will need renaming a sprint
later.

## Acceptance criteria

- [x] One documented meaning for `reset()`, identical in CLAUDE.md §9,
      [`docs/api/react.md`](../../api/react.md), and the implementation
- [x] If option B: `resetToInitial()` restores the exact `initialState` passed at mount
- [x] Restoring `initialState` runs it through `cleanFilterState`, like every other state write
- [x] The reset path fires `onChange`, consistent with the other mutators
- [x] Existing reset tests updated or extended, none silently deleted
- [x] `UseFilterBridgeReturn` type updated
      ([`packages/react/src/types.ts`](../../../packages/react/src/types.ts))

## Resolution

Option B, as recommended. `reset()` keeps its published meaning; `resetToInitial()` is additive.

On the task-7 ordering concern: the names do not collide with schema defaults. If task 7 lands,
"back to schema defaults" becomes a third, separately-named operation (`resetToDefaults()` or
equivalent) — `resetToInitial()` is unambiguous about which of the three it does and needs no
rename.

`initialState` is captured with `useRef(state)` on the first render, so the ref holds the *cleaned*
initial state and later changes to `options.initialState` are ignored by design (test:
`'ignores later changes to options.initialState'`).

Changed:

- [`packages/react/src/use-filter-bridge.ts`](../../../packages/react/src/use-filter-bridge.ts) — `initialStateRef`, `resetToInitial`
- [`packages/react/src/types.ts`](../../../packages/react/src/types.ts) — `resetToInitial` on `UseFilterBridgeReturn`, doc comment on `reset`
- [`packages/react/src/__tests__/use-filter-bridge.test.tsx`](../../../packages/react/src/__tests__/use-filter-bridge.test.tsx) — 9 new tests; the two existing `reset()` tests kept as-is
- [`docs/api/react.md`](../../api/react.md), [`packages/react/README.md`](../../../packages/react/README.md), root `README.md`, `CLAUDE.md` §9
- `.changeset/reset-semantics.md`

## Risk

Low for options A and B — the first is docs-only, the second is additive. High for option C, which
changes published runtime behavior for a method that already works as documented.

## Related

- [Task 7 — filter defaults](./07-filter-defaults.md) — settle this design first
- [Task 5 — external state sync](./05-external-state-sync.md) — same state lifecycle
