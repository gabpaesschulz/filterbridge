# Task 3 — Serialization does not validate against the schema

**Priority:** P0 — breaks the round-trip guarantee
**Area:** `@filterbridge/core`
**Status:** done — option B (drop + dev warning)

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record). Still accurate for `select` and `multiSelect` in
> `toSearchParams`. `toQueryDto` no longer merely drops an invalid value: it substitutes the
> filter's default when there is one, mirroring `parseFilters`.

---

## Problem

`parseFilters` validates `select` and `multiSelect` values against the schema's `options`.
`toSearchParams` and `toQueryDto` do not. A value that the schema forbids goes straight into the
URL and into the backend DTO, then vanishes when the URL is read back.

Verified against the current code:

```ts
const schema = defineFilters({
  status: select(['paid', 'failed'] as const),
  tags: multiSelect(['a', 'b'] as const),
})
const state = { status: 'bogus', tags: ['zzz'] }

toSearchParams(schema, state).toString()
// actual: "status=bogus&tags=zzz"

JSON.stringify(toQueryDto(schema, state))
// actual: '{"status":"bogus","tags":["zzz"]}'

parseFilters(schema, toSearchParams(schema, state))
// actual: {}      <- everything disappeared
```

## Why it matters

The library's core promise is that one schema keeps state, URL, and DTO consistent. Right now the
schema is enforced in exactly one of the three directions. The concrete consequences:

- **The round-trip is not a round-trip.** `parse(toSearchParams(state))` is not `state`, and the
  loss is silent. A user who bookmarks or shares such a URL gets a different screen than the one
  they were looking at.
- **The DTO is not trustworthy.** A backend receiving `status=bogus` is being handed a value the
  frontend's own schema rejects. The schema stops being a contract.
- **TypeScript does not save you.** `InferFilterState` types `status` as the literal union, but
  state arrives from `JSON.parse`, `localStorage`, saved presets, or a cast — all of which produce
  a plain `string` at runtime. The type is a compile-time hint, not a runtime guard, and
  `parseFilters` exists precisely because untrusted input is expected.

## Root cause

- [`packages/core/src/search-params.ts:22-32`](../../../packages/core/src/search-params.ts) —
  `select` writes any string; `multiSelect` joins any array without checking membership.
- [`packages/core/src/query-dto.ts:22-30`](../../../packages/core/src/query-dto.ts) — `select`
  is the loosest of all: `dto[key] = value` with no type check whatsoever, so a number or an object
  in that slot is copied through as-is.

Compare with [`parse-filters.ts:24-55`](../../../packages/core/src/parse-filters.ts), which does
the check properly on the way in.

## Decision needed before implementing

**How should an invalid value be handled on serialization?**

| Option | Behavior | Trade-off |
|--------|----------|-----------|
| A — drop silently | Match `parseFilters`: invalid values are omitted | Consistent and simple; the bug becomes invisible to the caller |
| B — drop + `console.warn` in dev | Same output, plus a message when `process.env.NODE_ENV !== 'production'` | Surfaces caller bugs; needs an env guard so it is stripped from production bundles |
| C — throw | Fail loudly on invalid state | Wrong for a serializer that is called on every render — a bad value would crash the UI |

**Recommendation: B.** Dropping is the only behavior consistent with the parse side, and a dev-only
warning is what makes the drop discoverable instead of just relocating the silence. Option C is not
viable: `toSearchParams` runs inside `useFilterBridge`'s render path
([`use-filter-bridge.ts:78-81`](../../../packages/react/src/use-filter-bridge.ts)), so throwing
turns a bad filter value into a blank page.

If the dev-warning adds too much weight for a first pass, ship A now and add the warning with
[task 7](./07-filter-defaults.md), which touches the same validation helpers.

## Proposed fix

Extract the membership check that `parse-filters.ts` already performs into a shared helper and call
it from all three modules, so the rule lives in one place:

```ts
// filter-validation.ts
export function isValidOption(filter: { options: readonly string[] }, value: unknown): boolean {
  return typeof value === 'string' && filter.options.includes(value)
}
```

Then in both serializers: filter `multiSelect` arrays through it and omit the key when nothing
survives; omit `select` entirely when the value fails.

## Acceptance criteria

- [x] `toSearchParams` omits `select` values outside `options`
- [x] `toSearchParams` filters invalid entries out of `multiSelect` and omits the key when empty
- [x] `toQueryDto` applies the identical rules, including a type check on `select`
- [x] Round-trip property test: for arbitrary state, `parse(toSearchParams(state))` equals the
      cleaned state — this is the assertion that would have caught the bug
- [x] Validation logic exists in exactly one module, used by parse and both serializers
- [x] If option B: warning fires in dev, is absent in production builds, and never throws

## Implementation notes

- `packages/core/src/filter-validation.ts` holds `isValidOption`, `validOptions` and
  `warnDroppedValue`. It is internal — not re-exported from `index.ts` — so the public API is
  unchanged and [task 7](./07-filter-defaults.md) can extend it freely.
- The dev guard is a bare `process.env.NODE_ENV !== 'production'` inside a `try`/`catch`, so
  bundlers still replace the literal and eliminate the branch, while an unbundled browser build
  (where `process` is undefined) returns `false` instead of throwing. Verified against
  `dist/index.cjs` with `globalThis.process` deleted.
- Parsing does not warn. Untrusted input is what `parseFilters` is for; only a serializer receiving
  a value the schema rejects indicates a caller bug.
- The property test in `roundtrip.test.ts` asserts a fixed point rather than comparing against a
  re-implementation of the cleaning rules: for 500 generated states,
  `toSearchParams(parse(toSearchParams(s)))` must equal `toSearchParams(s)`, and the parsed state
  must survive another full round trip. Confirmed to fail when the `select` check is reverted.

## Risk

**Behavior change on already-published code.** Callers passing invalid values currently see them in
the URL and DTO; after this they will not. That output is already broken — it does not survive a
re-parse — so no correct integration depends on it. Still, this must be called out explicitly in
the changeset rather than filed as a plain bug fix.

## Related

- [Task 4 — empty value normalization](./04-empty-value-normalization.md) — same round-trip test
- [Task 7 — filter defaults](./07-filter-defaults.md) — shares the validation helpers
- [Task 10 — release notes](./10-regression-tests-and-release.md) — must document the change
