# Task 7 — Per-filter defaults and `getDefaultFilterState`

**Priority:** P1 — documented-but-missing feature
**Area:** `@filterbridge/core`
**Status:** superseded in part — see [ADR-002](../../decisions/002-default-values.md)

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record). Two things in this file stopped being true:
> **all six builders accept a default** — only `select`, `multiSelect` and `boolean` do; and
> **option B applies to both serializers** — `toSearchParams` omits a value equal to its
> default, but `toQueryDto` carries it, because the backend on the other side has no
> decompressor. The body below records the reasoning as it stood when the task was done.

---

## Problem

CLAUDE.md describes default values in two places, and neither exists in the code.

- §7, on `text()` parsing: _"Empty string should become `undefined` **unless a default value is
  configured**"_ — no filter builder accepts any configuration at all. Every builder is a
  zero-argument or options-only factory
  ([`packages/core/src/filter-builders.ts`](../../../packages/core/src/filter-builders.ts)), and
  every filter type is a bare `_kind` marker
  ([`packages/core/src/filter-types.ts`](../../../packages/core/src/filter-types.ts)).
- §8: _"`getDefaultFilterState(schema)` — optional but useful. Can be implemented in a later wave"_
  — never implemented, not exported from
  [`packages/core/src/index.ts`](../../../packages/core/src/index.ts).

Listed as a roadmap item at [`docs/roadmap.md:17`](../../roadmap.md) and as known limitation
"No default values per filter in schema" in
[`docs/releases/v0.1.0.md:86`](../../releases/v0.1.0.md).

## Why it is worth doing now

Beyond closing a documented gap, it unblocks two things the sprint already needs:

1. **[Task 6](./06-reset-semantics.md) needs a definition of "default".** Without schema defaults,
   "reset" can only mean empty or `initialState`. With them there is a third, better-defined
   meaning, and picking names before that exists risks renaming later.
2. **Common admin cases currently have no clean expression.** "Default to unarchived" or "default
   page size 25" is today a manual merge at every call site, which is precisely the repeated glue
   code CLAUDE.md §2 says the library exists to remove.

## Decision needed before implementing

### 1. Builder signature

```ts
text({ default: 'invoice' })
select(['paid', 'failed'] as const, { default: 'paid' })
```

Options object rather than a positional argument: `select` already takes `options` positionally, and
a second positional would be unreadable. `default` is a reserved word but valid as a property name;
`defaultValue` is the safer alternative if the reserved word causes friction in any consumer's
tooling. Pick one and use it everywhere.

### 2. Does a default get serialized?

This is the design decision that actually matters.

| Option                         | Behavior                                         | Trade-off                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — always serialize           | A filter at its default still appears in the URL | URLs are explicit and self-describing, but every page starts with a cluttered query string                                                                                             |
| B — omit when equal to default | Default values never appear in the URL           | Clean URLs, and the common case has no query string — but a URL no longer fully describes the state, and changing a default in code silently changes the meaning of every old bookmark |

**Recommendation: B**, because clean default URLs are the reason to want defaults at all, and
option A makes `?archived=false&status=all` the landing state of every admin page. The bookmark
caveat is real and must be documented, not hidden.

Note B affects **all three** core functions, not just parsing: `parseFilters` fills a missing key
with the default, and both serializers must omit values equal to it, or the round-trip breaks
immediately.

### 3. Are defaults validated?

`select({ default: 'bogus' })` should be caught. Reuse the shared validation helper introduced in
[task 3](./03-serialization-validation.md) — that task and this one touch the same code, so do task
3 first.

## Type impact

`InferFilterState` currently makes every field optional
([`packages/core/src/infer.ts:25-27`](../../../packages/core/src/infer.ts)). A filter with a default
is never absent after a parse, so it could be typed as required. That is a materially nicer API and
a materially more complex conditional type.

**Recommendation: keep everything optional for `0.1.x`.** CLAUDE.md §10 asks for "simple generic
types over clever unreadable ones", and narrowing optionality is a breaking type change that
deserves its own release. Revisit for `v1.0`.

## Acceptance criteria

- [x] All six builders accept an optional default; `dateRange`/`numberRange` accept partial ranges
- [x] `parseFilters` applies the default when the key is absent or invalid
- [x] Serialization behavior matches the decision in §2, in `toSearchParams` **and** `toQueryDto`
- [x] Round-trip holds with defaults present: `parse(toSearchParams(state))` equals the cleaned state
- [x] `getDefaultFilterState(schema)` implemented and exported from `@filterbridge/core`
- [x] `select`/`multiSelect` defaults validated against `options`
- [x] Schemas without defaults behave exactly as they do today — verified by the existing suite
      passing unmodified
- [x] Documented in [`docs/api/core.md`](../../api/core.md), including the bookmark caveat if B
- [x] Roadmap item checked, limitation removed from the release notes

## Resolution

Both decisions taken as recommended: `default` as the property name, and **option B** — a value
equal to its default is omitted by `toSearchParams` _and_ `toQueryDto`.

### Design notes

**Defaults are normalized once, in the builder**, to the exact shape a parser produces: a trimmed
text default, a range with empty or non-finite sides dropped. Without that, `{ from: '' }` as a
default would never compare equal to the parsed `{}`, and a filter at its default would still emit a
param. A default that normalizes to nothing (`text({ default: '   ' })`, `multiSelect(opts,
{ default: [] })`) is treated as no default at all.

**Validation throws**, unlike the serializers, which drop a bad value and warn. The reasoning in
task 3 for not throwing was that serializers run inside React render paths on untrusted state. A
default is the opposite: static configuration evaluated at module load, where an invalid value is a
typo that fails identically on every run. It reuses task 3's membership rule
([`filter-validation.ts`](../../../packages/core/src/filter-validation.ts) — `isValidOption` and the
new `assertValidDefaults` both call the same `includesOption`).

**`multiSelect` comparison is positional.** An order-insensitive comparison would break the round
trip: `['failed', 'paid']` would be judged equal to a default of `['paid', 'failed']`, be omitted,
and parse back in the default's order — a state change caused by serializing. A reordered selection
is a different state and stays in the URL.

**Ranges are compared as a whole.** A range matching the default on one side only is written in
full; omitting the matching side would parse back as the full default range and silently widen the
filter.

**`InferFilterState` still makes every field optional**, as recommended — narrowing optionality for
defaulted filters is a breaking type change that belongs to `v1.0`.

### The cost of option B, stated where users will see it

Two consequences are documented in [`docs/api/core.md`](../../api/core.md#default-values) rather
than hidden:

- Changing a default in code changes what old bookmarks mean.
- "No value" is unreachable through the URL for a filter that has a default —
  `boolean({ default: false })` gives no way to express "show both". The docs recommend modelling
  the third state explicitly as `select(['all', 'active', 'archived'], { default: 'active' })`.

### Deliberately out of scope

`@filterbridge/react` is untouched — task 7 is a core task, and the hook stays uncontrolled and
defaults-agnostic. There is no `resetToDefaults()`; the docs give the `setMany` recipe and name it
as the third reset meaning, as [task 6](./06-reset-semantics.md) anticipated. Worth its own task if
it turns out to be wanted.

### Changed

- [`packages/core/src/filter-types.ts`](../../../packages/core/src/filter-types.ts) — `default?` on
  all six interfaces; `DateRangeValue` / `NumberRangeValue` extracted and exported
- [`packages/core/src/filter-builders.ts`](../../../packages/core/src/filter-builders.ts) —
  `FilterConfig<TValue>`, normalization, validation
- [`packages/core/src/defaults.ts`](../../../packages/core/src/defaults.ts) — new: `filterDefault`,
  `isAtDefault`, `getDefaultFilterState`
- [`packages/core/src/filter-validation.ts`](../../../packages/core/src/filter-validation.ts) —
  `assertValidDefaults`, `includesOption`
- `parse-filters.ts`, `search-params.ts`, `query-dto.ts`, `index.ts`, `infer.ts`
- [`packages/core/src/__tests__/filter-defaults.test.ts`](../../../packages/core/src/__tests__/filter-defaults.test.ts)
  — 31 new tests, including a 500-case round-trip property test against a schema where every filter
  has a default
- [`docs/api/core.md`](../../api/core.md), [`packages/core/README.md`](../../../packages/core/README.md),
  [`docs/roadmap.md`](../../roadmap.md), [`docs/releases/v0.1.0.md`](../../releases/v0.1.0.md),
  `CLAUDE.md` §7 and §8
- `.changeset/filter-defaults.md`

## Risk

Medium. Purely additive at the API level, but defaults touch every code path in core, and option B
makes serialization depend on schema configuration for the first time. The "no defaults behaves
identically" criterion is the guard: the existing 299 tests must pass without modification.

## Related

- [Task 3 — serialization validation](./03-serialization-validation.md) — do first, shares helpers
- [Task 6 — reset semantics](./06-reset-semantics.md) — depends on this design
