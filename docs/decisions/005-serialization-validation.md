# ADR-005: Serialization validates against the schema, and never throws

**Date:** 2026-08-13
**Status:** accepted

## Context

`parseFilters` validated `select` and `multiSelect` values against the schema's `options`.
`toSearchParams` and `toQueryDto` did not. A value the schema forbade went straight into the URL and
into the backend DTO, and then vanished when the URL was read back:

```ts
const state = { status: 'bogus', tags: ['zzz'] }

toSearchParams(schema, state).toString()   // 'status=bogus&tags=zzz'
parseFilters(schema, toSearchParams(schema, state))  // {} — everything gone
```

The library's premise is that one schema keeps state, URL and DTO consistent. The schema was being
enforced in one of the three directions.

TypeScript does not save you here. `InferFilterState` types `status` as the literal union, but state
arrives from `JSON.parse`, `localStorage`, a saved preset or a cast — all of which produce a plain
string at runtime. `parseFilters` exists precisely because untrusted input is expected; the
serializers are reachable from the same places.

## Decision 1 — an invalid value is dropped, not thrown on

| Option | Why not |
|---|---|
| A — drop silently | Consistent with parsing, but the caller's bug becomes invisible |
| **B — drop + dev-only `console.warn`** ✅ | chosen |
| C — throw | **Not viable.** `toSearchParams` runs inside `useFilterBridge`'s render path, so a bad filter value would turn into a blank page |

Dropping is the only behavior consistent with the parse side. The dev warning is what makes the drop
discoverable rather than just relocating the silence.

The environment guard is a bare `process.env.NODE_ENV !== 'production'` inside a `try`/`catch`, so
bundlers still replace the literal and eliminate the branch, while an unbundled browser build — where
`process` is undefined — returns `false` instead of throwing.

Parsing does **not** warn. Untrusted input is what `parseFilters` is for. Only a *serializer*
receiving a value the schema rejects indicates a caller bug.

## Decision 2 — a configured default throws instead

`select(['pending', 'paid'], { default: 'bogus' })` throws at schema definition. This is the one
place core throws, and it is the deliberate opposite of decision 1.

The reasoning in decision 1 for not throwing was that serializers run inside React render paths on
untrusted state. A default is the opposite: static configuration evaluated at module load, where an
invalid value is a source-level typo that fails identically on every run. Failing at definition is
strictly better than silently parsing to `undefined` in production six months later.

Both paths call the same membership rule.

## Decision 3 — the rule lives in exactly one module

`packages/core/src/filter-validation.ts` holds `isValidOption`, `validOptions`,
`assertValidDefaults` and `warnDroppedValue`, used by `parseFilters` and both serializers. It is
internal — not re-exported from `index.ts`.

This is the actual fix. The bug was not that a check was missing in two places; it was that the rule
existed in one place and the other two did not consult it. One module means the three directions
cannot drift apart again, and it is why the same rule extended cleanly to defaults in
[ADR-002](./002-default-values.md) without a second implementation.

`isAtDefault` is public for the same reason from the other side: `@filterbridge/react` needs the
default comparison for `activeFilterCount`, and re-implementing it there would recreate exactly the
drift this ADR closed.

## Consequences

- **Behavior change on published code.** Callers passing values outside `options` used to see them
  in the URL and the DTO. That output never survived a re-parse, so no correct integration depended
  on it — but it was called out explicitly in the changeset rather than filed as a bug fix.
- The same normalization applies to empty and whitespace values: emitted text is trimmed and dropped
  when nothing survives, and range objects are rebuilt from their surviving sides rather than passed
  through. A value the parser rejects can no longer be produced by a serializer.
- Non-finite numbers are guarded with `Number.isFinite` on both sides. `parseFloat('Infinity')` is
  `Infinity`, so the parser leaked them in as well as out.
- The round-trip property test asserts a fixed point rather than comparing against a
  re-implementation of the cleaning rules: for generated states,
  `toSearchParams(parse(toSearchParams(s)))` must equal `toSearchParams(s)`, and the parsed state
  must survive another full round trip. That property is what would have caught this, and it caught
  two further defects nobody had predicted — `parseFloat('Infinity')`, and `toQueryDto` never
  type-checking `boolean`.
