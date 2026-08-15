# Task 2 — Custom URL keys for `dateRange` and `numberRange`

**Priority:** P1 — the sprint's only API change
**Area:** `@filterbridge/core`, `@filterbridge/browser`, `@filterbridge/next`
**Status:** open

---

## Problem

A `dateRange` filter named `createdAt` always serializes to `createdAtFrom` / `createdAtTo`, and a
`numberRange` named `amount` always to `amountMin` / `amountMax`. The suffixes are not configurable
anywhere in the public API.

That is fine when FilterBridge owns both ends of the URL. It stops being fine the moment the query
string is consumed by something that already has an opinion about its parameter names — an existing
REST endpoint expecting `created_after` / `created_before`, a URL scheme that predates the library,
or a backend shared with a non-JavaScript client. Today the only way to use FilterBridge against
such an API is to rename the params by hand after `toSearchParams()`, which reintroduces exactly the
glue code the library exists to delete ([CLAUDE.md §2](../../../CLAUDE.md)).

Listed on [the roadmap](../../roadmap.md#02x--stability-and-ergonomics) as _"Optional custom key
suffixes for `dateRange` and `numberRange`"_ and excluded by name from
[Sprint 0](../sprint-0/README.md#not-in-this-sprint).

## The larger problem underneath it

The suffixes are hardcoded, independently, in **three** packages:

| Package                           | Location                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `core` — parse                    | [`parse-filters.ts:83-84, 97-98`](../../../packages/core/src/parse-filters.ts)                         |
| `core` — serialize                | [`search-params.ts:63-64, 73-74`](../../../packages/core/src/search-params.ts)                         |
| `browser` — which params to strip | [`filter-param-keys.ts:8, 11`](../../../packages/browser/src/filter-param-keys.ts)                     |
| `next` — normalization            | [`normalize-next-search-params.ts:84-102`](../../../packages/next/src/normalize-next-search-params.ts) |

Four copies of one rule. This is the same shape as
[Sprint 0 task 1](../sprint-0/01-repeated-query-params.md), where `core` and `next` disagreed about
repeated params and a Next.js app got two different states for one URL — a data-loss bug caused by
duplicated knowledge, not by a missing feature.

Adding a per-filter key option to four independent copies would make that worse. **The refactor is
the point of the task; the feature is what justifies doing it now.**

## Decisions needed before implementing

### 1. Where does key derivation live?

Core owns it, and the adapters consume it. Concretely, core exports a function that maps a schema
entry to the param keys it reads and writes, and `browser`'s `getFilterParamKeys` becomes a
re-export or a thin wrapper over it.

`getFilterParamKeys` is already public API in `@filterbridge/browser`
([`docs/api/browser.md`](../../api/browser.md)) and must keep working with the same name, signature
and return type. Moving the implementation is not a breaking change; removing the export is.

Suggested core surface — decide the names, not the idea:

```ts
// one filter → the keys it occupies
export function filterParamKeys(name: string, filter: AnyFilter): string[]

// whole schema → every key it occupies (what browser already exposes)
export function getFilterParamKeys(schema: FilterSchema): string[]
```

`next` uses the per-filter form in its `switch`; `browser` re-exports the schema form.

### 2. Option shape

| Option                     | Example                                                                | Trade-off                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A — full key override      | `dateRange({ keys: { from: 'created_after', to: 'created_before' } })` | Expresses any target scheme, including snake_case, where the filter name is not a prefix at all                                                |
| B — suffix override        | `dateRange({ suffixes: { from: '_after', to: '_before' } })`           | Shorter for the common case, but cannot produce `created_after` from a filter named `createdAt` — the base is always the camelCase filter name |
| C — schema-wide convention | `defineFilters({...}, { rangeKeys: 'snake' })`                         | One setting for the whole schema, but it is a naming convention with no escape hatch, and conventions are where this kind of API goes to die   |

**Recommendation: A.** It is the only one that covers the motivating case. Partial overrides should
be allowed — `dateRange({ keys: { from: 'after' } })` leaves `to` as `createdAtTo` — because
half-configured is a real state and silently requiring both is a worse error than a mixed URL.

### 3. Does this extend to the scalar filters?

`text('search')` serializing to `q` is the obvious next request. The roadmap item covers ranges
only, and this sprint should stay there — but pick the option shape so scalars can be added later
**without renaming anything**: `keys: { from, to }` / `keys: { min, max }` for ranges leaves `key:
string` free for scalars. Do not name the range option `key`.

### 4. Does a custom key reach `toQueryDto`?

**No.** The DTO is keyed by filter name and nests ranges as `{ from, to }`
([`docs/api/core.md`](../../api/core.md)); custom keys are a URL concern. A backend that wants
different DTO field names is renaming JSON properties, which is not the same problem and is not in
scope. Say so in the docs, because "I set `keys` and my DTO did not change" is the support question
this will generate.

### 5. Collisions

Two filters can now resolve to the same param key, and a custom key makes it easy:

```ts
defineFilters({
  createdAt: dateRange({ keys: { from: 'start' } }),
  start: text(), // both own `start`
})
```

Note this is **already possible today** without any new option — `defineFilters({ createdAtFrom:
text(), createdAt: dateRange() })` collides on `createdAtFrom` right now, and the last writer wins
silently in `toSearchParams`.

Recommendation: `defineFilters` throws on a duplicate param key, matching
`assertValidDefaults` — the one place core throws, for the reason
[ADR-002](../../decisions/002-default-values.md) gives: this is static configuration evaluated at
module load, where the failure is a typo that fails identically on every run, not untrusted input
arriving in a render path. Fixing the pre-existing collision is a small behavior change and needs
its own line in the changeset.

## Acceptance criteria

- [ ] `dateRange` and `numberRange` accept an optional `keys` override, partial or complete
- [ ] A schema with no `keys` produces byte-identical URLs to `0.2.0` — verified by the existing
      suite passing **unmodified**
- [ ] `parseFilters` and `toSearchParams` round-trip through custom keys
- [ ] `getFilterParamKeys` reports the custom keys, so `createFilterUrl` strips stale ones
      correctly
- [ ] `@filterbridge/next` resolves custom keys identically to core, asserted by a test in the
      existing cross-package parity suite
      ([`packages/next/src/tests/core-parity.test.ts`](../../../packages/next/src/tests/core-parity.test.ts))
- [ ] Exactly one implementation of key derivation remains in the repository
- [ ] `getFilterParamKeys` still exports from `@filterbridge/browser` with an unchanged signature
- [ ] `toQueryDto` output is unaffected by `keys`, and a test says so
- [ ] Duplicate param keys throw at `defineFilters`, including the pre-existing case with no custom
      keys
- [ ] Documented in [`docs/api/core.md`](../../api/core.md) and
      [`docs/api/browser.md`](../../api/browser.md); roadmap item checked off
- [ ] `.smoke/` assertions cover the new option in ESM and CJS

## Risk

Medium. The feature is additive, but the refactor touches the parse and serialize paths in core and
the normalization path in `next` — the code Sprint 0 spent four tasks stabilizing. The guard is the
second criterion: the 538 existing tests must pass with no edits. Any test that needs changing is
evidence the refactor changed behavior it was not supposed to.

The collision check is the part most likely to break a real user, since it turns a currently-silent
schema into a throw at import time. It is the right call — a schema with two filters fighting over
one param was never working — but it belongs in the changeset as a behavior change, not as a
footnote.

## Related

- [Sprint 0 task 1 — repeated query params](../sprint-0/01-repeated-query-params.md) — the drift
  this refactor prevents from recurring
- [Task 5 — release](./05-release.md) — this task is why the sprint targets a minor
