# Task 2 — `NaN` and `Infinity` leak into URL and DTO

**Priority:** P0 — produces invalid output
**Area:** `@filterbridge/core`
**Status:** done

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record).Accurate as written.

---

## Problem

A `numberRange` holding a non-finite number is serialized verbatim. Verified against the current
code:

```ts
const schema = defineFilters({ amount: numberRange() })
const state = { amount: { min: NaN, max: 10 } }

toSearchParams(schema, state).toString()
// actual: "amountMin=NaN&amountMax=10"

JSON.stringify(toQueryDto(schema, state))
// actual: '{"amount":{"min":null,"max":10}}'
```

Two distinct failures fall out of this:

1. **The URL becomes unparseable by its own parser.** `parseFilters` rejects `"NaN"` via its
   `isNaN` guard, so `amountMin=NaN` is dropped on the way back in. The round-trip loses the key
   without reporting anything.
2. **The DTO silently becomes `null` over the wire.** `JSON.stringify` has no `NaN` literal, so
   the backend receives `{"min": null}`. A backend that treats `null` as "no lower bound" and one
   that treats it as an explicit null value will disagree, and neither sees the real problem.

`Infinity` behaves the same way: `String(Infinity)` → `"Infinity"` in the URL, `null` in JSON.

## How a caller reaches this state

Easily, and without doing anything unusual — any UI that maps an input event to `Number()` will
produce `NaN` for input the browser hands back as a non-numeric string. The demo's own handlers
are one `Number(value)` call away from it
([`apps/demo/src/components/FilterCard.tsx:41-49`](../../../apps/demo/src/components/FilterCard.tsx)).
The React hook does not filter it either: `cleanFilterState` only treats `undefined`/`null` as
empty, and `NaN` is neither
([`packages/react/src/clean-state.ts:1-9`](../../../packages/react/src/clean-state.ts)).

## Root cause

Both serializers guard with `!== undefined`, which `NaN` passes:

- [`packages/core/src/search-params.ts:47-52`](../../../packages/core/src/search-params.ts)
  ```ts
  if (range.min !== undefined) params.set(`${key}Min`, String(range.min))
  ```
- [`packages/core/src/query-dto.ts:44-50`](../../../packages/core/src/query-dto.ts)
  ```ts
  if (range.min !== undefined || range.max !== undefined) { dto[key] = range }
  ```

Note the DTO case is coarser: it copies the whole `range` object through, so it emits the bad value
even when only one side is non-finite.

## Proposed fix

Guard with `Number.isFinite` in both serializers, and treat a non-finite side as absent rather than
as a value. In `toQueryDto`, rebuild the range from the surviving sides instead of passing the
original object through — that also fixes the "one bad side poisons the object" behavior and is a
prerequisite for [task 4](./04-empty-value-normalization.md).

```ts
// query-dto.ts — numberRange
const range = value as { min?: number; max?: number }
const next: { min?: number; max?: number } = {}
if (Number.isFinite(range.min)) next.min = range.min
if (Number.isFinite(range.max)) next.max = range.max
if (next.min !== undefined || next.max !== undefined) dto[key] = next
```

Also consider rejecting non-finite numbers at the React layer so the bad value never enters state:
add a `Number.isFinite` check to `isEmptyValue`'s number branch in
[`clean-state.ts`](../../../packages/react/src/clean-state.ts). This is defense in depth, not a
substitute for the core fix — core must be correct on its own.

## Acceptance criteria

- [x] `toSearchParams` omits any non-finite `min`/`max`; `NaN` and `Infinity` never appear in a URL
- [x] `toQueryDto` omits non-finite sides and drops the key entirely when no side survives
- [x] A range where one side is finite and the other is not keeps only the finite side
- [x] `JSON.stringify(toQueryDto(...))` never emits `null` for any input
- [x] `cleanFilterState` treats `NaN` as an empty value
- [x] Tests cover `NaN`, `Infinity`, and `-Infinity` for both serializers

## Risk

Low. Every affected input is already broken end-to-end — the URL form does not survive a re-parse
and the DTO form is not representable in JSON. No caller can be depending on the current output.

## Related

- [Task 4 — empty value normalization](./04-empty-value-normalization.md) — same rebuild-the-object fix
- [Task 8 — demo fixes](./08-demo-fixes.md) — the input handlers that can produce `NaN`
