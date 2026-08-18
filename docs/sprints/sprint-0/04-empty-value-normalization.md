# Task 4 — Empty and whitespace values leak into output

**Priority:** P0 — inconsistent parse/serialize behavior
**Area:** `@filterbridge/core`
**Status:** done

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record).Accurate as written.

---

## Problem

`parseFilters` trims strings and discards empty ones. The serializers do neither, so values that
could never come _out_ of a parse can still go _into_ a URL or a DTO.

Verified against the current code:

```ts
const schema = defineFilters({ search: text(), createdAt: dateRange() })

// whitespace-only text
toSearchParams(schema, { search: '   ' }).toString()
// actual:   "search=+++"
// expected: ""

JSON.stringify(toQueryDto(schema, { search: '   ' }))
// actual:   '{"search":"   "}'
// expected: '{}'

// empty side of a range
JSON.stringify(toQueryDto(schema, { createdAt: { from: '', to: '2026-01-01' } }))
// actual:   '{"createdAt":{"from":"","to":"2026-01-01"}}'
// expected: '{"createdAt":{"to":"2026-01-01"}}'
```

## Why it matters

- `search=+++` is a filter that matches on three spaces. It survives a copy-paste of the URL, and
  `parseFilters` then trims it to nothing — so the link does not reproduce the sender's screen.
- `{"from": ""}` reaching a backend is worse than an absent key. An empty string is a value, and a
  naive `WHERE created_at >= ''` or a date parser handed `''` fails in a way that an absent key
  would not.
- CLAUDE.md §11 states the core principle as "omit empty values from URL/query DTO output". The
  current behavior does that on the parse side only.

## How a caller reaches this state

Not an exotic input — it is the default shape of a cleared field. `<input type="date">` reports
`''` when emptied, and the demo writes exactly that shape into state before its `|| undefined`
guard runs
([`apps/demo/src/components/FilterCard.tsx:33-39`](../../../apps/demo/src/components/FilterCard.tsx)).
The React layer does not catch it either: `cleanFilterState` only removes an object when _every_
value is nullish, so `{ from: '', to: 'x' }` is kept whole
([`packages/react/src/clean-state.ts:5-7`](../../../packages/react/src/clean-state.ts)).

## Root cause

Three places, all missing the normalization that `parse-filters.ts` performs:

- [`search-params.ts:16-20`](../../../packages/core/src/search-params.ts) — `text` checks
  truthiness but never trims, so `'   '` passes.
- [`query-dto.ts:16-20`](../../../packages/core/src/query-dto.ts) — same.
- [`query-dto.ts:36-42`](../../../packages/core/src/query-dto.ts) — `dateRange` assigns the whole
  `range` object when _either_ side is truthy, copying the empty side along with it.

`toSearchParams`'s `dateRange` case is already correct — it writes each side independently behind a
truthiness check ([`search-params.ts:40-45`](../../../packages/core/src/search-params.ts)). The DTO
path is the outlier.

## Proposed fix

Apply the same normalization on the way out as on the way in.

1. **Text:** trim before the emptiness check in both serializers. Decide whether the _trimmed_ or
   the _original_ string is emitted — recommendation: emit the trimmed value, so
   `search=' foo '` and `search='foo'` produce identical URLs and the round-trip is stable.
2. **Ranges:** rebuild the object from surviving sides instead of passing it through, exactly as in
   [task 2](./02-non-finite-numbers.md):

```ts
// query-dto.ts — dateRange
const range = value as { from?: string; to?: string }
const next: { from?: string; to?: string } = {}
if (typeof range.from === 'string' && range.from.trim()) next.from = range.from.trim()
if (typeof range.to === 'string' && range.to.trim()) next.to = range.to.trim()
if (next.from !== undefined || next.to !== undefined) dto[key] = next
```

Tasks 2 and 4 rewrite the same two `case` blocks. Implement them together.

## Acceptance criteria

- [x] Whitespace-only `text` is omitted from both `toSearchParams` and `toQueryDto`
- [x] Surrounding whitespace is trimmed in emitted text values
- [x] `toQueryDto` omits empty range sides and drops the key when no side survives
- [x] `toQueryDto` never emits `''` for any field
- [x] Idempotence test: `toQueryDto(schema, parseFilters(schema, params))` equals
      `toQueryDto(schema, state)` for the same logical state
- [x] `cleanFilterState` removes objects whose values are all empty strings, not just all nullish

**Implemented in:** [`search-params.ts`](../../../packages/core/src/search-params.ts) (text + dateRange
trimming), [`query-dto.ts`](../../../packages/core/src/query-dto.ts) (text trimming, dateRange
rebuilt side by side), [`clean-state.ts`](../../../packages/react/src/clean-state.ts) (recursive
emptiness check). Tests: [`empty-values.test.ts`](../../../packages/core/src/__tests__/empty-values.test.ts),
[`clean-state.test.ts`](../../../packages/react/src/__tests__/clean-state.test.ts).

`toSearchParams`'s `dateRange` case was trimmed as well, beyond the stated fix — it discarded an
empty side already, but an untrimmed `' 2026-01-01 '` would have produced a URL that `parseFilters`
re-reads as the trimmed value, breaking the round trip.

## Risk

Low. Every affected value is one the parser already rejects, so it cannot survive a URL round-trip
today. Bundle with tasks 2 and 3 in one changeset, since all three narrow serializer output.

## Related

- [Task 2 — non-finite numbers](./02-non-finite-numbers.md) — same range-rebuild fix
- [Task 3 — serialization validation](./03-serialization-validation.md) — same round-trip property test
- [Task 8 — demo fixes](./08-demo-fixes.md) — the handlers producing these shapes
