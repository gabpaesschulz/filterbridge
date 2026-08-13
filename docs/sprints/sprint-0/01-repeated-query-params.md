# Task 1 — Repeated query params are silently dropped

**Priority:** P0 — data loss
**Area:** `@filterbridge/core`
**Status:** done

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record).Accurate as written.

---

## Problem

When `parseFilters` receives a `URLSearchParams` containing the same key more than once, only the
last occurrence survives. For a `multiSelect` filter this silently discards user-selected values.

Verified against the current code:

```ts
const schema = defineFilters({ tags: multiSelect(['a', 'b'] as const) })

parseFilters(schema, new URLSearchParams('tags=a&tags=b'))
// actual:   { tags: ['b'] }
// expected: { tags: ['a', 'b'] }
```

There is no error and no warning. The filter simply comes back with fewer values than the URL
contained.

## Why it matters beyond the missing feature

This is not only an unimplemented format. `@filterbridge/next` already handles repeated params
correctly, so the same URL parsed by two FilterBridge packages produces two different results:

| Input | `parseFilters` (core) | `parseNextSearchParams` (next) |
|-------|----------------------|-------------------------------|
| `tags=a&tags=b` | `{ tags: ['b'] }` | `{ tags: ['a', 'b'] }` |

A Next.js app that parses on the server with `@filterbridge/next` and re-parses on the client with
`@filterbridge/core` gets a state mismatch on hydration.

## Root cause

[`packages/core/src/parse-filters.ts:6-15`](../../../packages/core/src/parse-filters.ts) —
`normalizeInput` flattens `URLSearchParams` with `forEach`, assigning into a plain object, so each
repeated key overwrites the previous value:

```ts
input.forEach((value, key) => {
  result[key] = value   // last one wins
})
```

`parseMultiSelect` already accepts `string[]`
([`parse-filters.ts:47-51`](../../../packages/core/src/parse-filters.ts)), so the array path exists
and works — the values are lost before they reach it.

## Proposed fix

Port the `getAll` strategy already proven in
[`packages/next/src/normalize-next-search-params.ts:17-26`](../../../packages/next/src/normalize-next-search-params.ts):
collect every value per key and collapse to a scalar only when there is exactly one.

```ts
function normalizeInput(input: RawInput | URLSearchParams): RawInput {
  if (typeof URLSearchParams !== 'undefined' && input instanceof URLSearchParams) {
    const result: RawInput = {}
    for (const key of new Set(input.keys())) {
      const all = input.getAll(key)
      result[key] = all.length > 1 ? all : all[0]
    }
    return result
  }
  return input as RawInput
}
```

Single-valued keys keep their current `string` shape, so `parseText`, `parseSelect`,
`parseBoolean`, `parseDateRange`, and `parseNumberRange` are untouched.

### Decide before implementing

What should a repeated param mean for a **non**-`multiSelect` filter? `search=a&search=b` would now
reach `parseText` as `['a', 'b']`, which is not a string, so the current guard returns `undefined` —
the filter disappears entirely instead of taking one of the values.

Recommendation: take the first element for scalar filters, matching `@filterbridge/next`'s
documented behavior ("For text, select, boolean: `string[]` input picks the first element"). This
keeps the two packages consistent, which is the whole point of the task.

## Acceptance criteria

- [x] `parseFilters(schema, new URLSearchParams('tags=a&tags=b'))` → `{ tags: ['a', 'b'] }`
- [x] Mixed forms work: `tags=a,b&tags=c` → `['a', 'b', 'c']`
- [x] Invalid values in a repeated param are still discarded against `options`
- [x] Scalar filters resolve repeated params consistently with `@filterbridge/next`
- [x] A test asserts core and `next` produce identical state for the same repeated-param URL
- [x] Plain-record input (`{ tags: 'a,b' }`) behavior is unchanged
- [x] "Known limitations" entry removed from [`docs/releases/v0.1.0.md:83`](../../releases/v0.1.0.md)
      and the roadmap item at [`docs/roadmap.md:16`](../../roadmap.md) is checked off

## Resolution

Implemented in [`packages/core/src/parse-filters.ts`](../../../packages/core/src/parse-filters.ts):

- `normalizeInput` uses `getAll` per unique key, collapsing to a scalar only when there is one value.
- A `scalar()` helper unwraps arrays for `text`, `select`, `boolean`, `dateRange`, and `numberRange`,
  taking the first element as recommended.
- `parseMultiSelect` splits each array entry on commas, so mixed forms work.

Tests: [`packages/core/src/__tests__/repeated-params.test.ts`](../../../packages/core/src/__tests__/repeated-params.test.ts)
and the cross-package parity suite in
[`packages/next/src/tests/core-parity.test.ts`](../../../packages/next/src/tests/core-parity.test.ts).

Changeset: `.changeset/repeated-query-params.md` (patch to `@filterbridge/core`).

## Risk

Low. This only widens what is accepted. No currently-working input changes meaning, with the
exception of the scalar-filter decision above, which today produces `undefined` — an outcome no
reasonable caller depends on.

## Related

- [Task 3 — serialization validation](./03-serialization-validation.md) — round-trip guarantees
- [Task 10 — regression tests](./10-regression-tests-and-release.md)
