# Task 3 — Custom URL key for the scalar filters

**Priority:** P1 — the sprint's API change, and it closes a claim `core` already makes
**Area:** `@filterbridge/core`, `@filterbridge/next`
**Status:** planned

---

## Problem

A `text` filter named `search` always serializes to `?search=`. A `select` named `status` always to
`?status=`. There is no way to spell `text({ key: 'q' })`.

[Sprint 1 task 2](../sprint-1/02-custom-range-keys.md) solved this for `dateRange` and `numberRange`
and stopped there on purpose — decision 3 of that task was "scalars out of scope", and the range
option was named `keys` rather than `key` specifically so that `key: string` would stay free for
this. The reservation is written into the type:

```ts
// packages/core/src/filter-types.ts
/**
 * Named `keys` and not `key` deliberately: `key: string` stays free for a
 * future scalar override, so adding one will not rename this.
 */
export interface DateRangeKeys { … }
```

The motivating case is unchanged from Sprint 1: FilterBridge stops owning both ends of the URL the
moment the query string is consumed by an API that already has an opinion about its parameter names.
For ranges that meant `created_after` / `created_before`. For scalars it means `q`, `page_size`,
`is_archived` — and today the only way to get them is to rename params by hand after
`toSearchParams()`, which is the glue code the library exists to delete
([CLAUDE.md §2](../../../CLAUDE.md)).

## The larger problem underneath it

`param-keys.ts` opens with this:

> The one place in the repository that knows how a filter name becomes a URL param key.

That is true for two of the six filter kinds. For the other four, three files still index the input
by the filter name directly:

| File                                                | What it does                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/core/src/parse-filters.ts`                | `parseText(raw, key)`, `parseSelect(raw, key, …)`, … where `key` is the schema name |
| `packages/core/src/search-params.ts`                | `params.set(key, trimmed)` for `text`, `select`, `multiSelect`, `boolean`           |
| `packages/next/src/normalize-next-search-params.ts` | the scalar branches of its `switch` read `searchParams[key]`                        |

Nothing misbehaves today, because for a scalar the derivation happens to be the identity function.
That is precisely why it is worth fixing now rather than later: the code is correct by coincidence,
the module comment says it is correct by construction, and the feature that turns the coincidence
into a bug is the one being added.

This is the same shape as
[Sprint 0 task 1](../sprint-0/01-repeated-query-params.md) — `core` and `next` disagreeing about one
URL, silently — and the reason Sprint 1's task 2 refused to add an override to four independent
copies of the derivation.

---

## Decisions needed before implementing

### Decision 1 — where does the option live on the builders?

| Option                                                                          | Shape                                                                                                | Trade-off                                                                                                                                                            |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — `key` on the existing `FilterConfig`, plus a config argument for `text`** | `select(opts, { default: 'paid', key: 'st' })`, `boolean({ key: 'archived' })`, `text({ key: 'q' })` | One field, one name, and it reads the same on all four builders. `text()` gains its first-ever argument, so `FilterConfig<TValue>` needs a variant with no `default` |
| B — a positional string on `text` only                                          | `text('q')`                                                                                          | Shortest for the most common case, and it is the form the roadmap sketched. But it makes `text` the odd builder out and leaves the other three unanswered            |
| C — a separate `KeyConfig` type mixed into each builder                         | Explicit about which builders take what                                                              | More types for no reader benefit; `FilterConfig` already exists and already means "the last argument"                                                                |

**Recommended: A.** It gives the same spelling to all four scalar builders and to both range
builders (`key` for one param, `keys` for two), and the reservation in `filter-types.ts` was written
with exactly this in mind. B should be rejected explicitly rather than by omission: `text('q')` is
nicer in isolation and worse in a schema where the filter next to it needs `select(opts, { key })`.

The type wrinkle to settle while implementing: `text` must accept `{ key }` and must **not** accept
`{ default }` — [ADR-002 §4](../../decisions/002-default-values.md) makes that a type error at the
call site, and it has to stay one.

### Decision 2 — what validation applies?

The range keys already go through `assertValidParamKeys`, which rejects an empty key and one with
leading or trailing whitespace — padding is rejected rather than trimmed, so the param name in the
source is the param name on the wire.

**Recommended: the same function, unchanged.** A scalar key is the same kind of thing as a range key
and there is no reason for two rules. The collision check in `defineFilters` already operates on
whatever `filterParamKeys` reports, so `{ search: text({ key: 'q' }), q: text() }` starts throwing
for free — worth an explicit test rather than trusting that it follows.

### Decision 3 — how far does the refactor go?

| Option                                                                                 | Trade-off                                                                                                                                          |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — route every scalar read and write through `param-keys.ts`, then add the option** | Makes the module's claim true for all six kinds. Two commits: a behavior-preserving refactor guarded by 581 green tests, then the additive feature |
| B — add the option and special-case it where needed                                    | Smaller diff, and it leaves the derivation in four places again — the exact state Sprint 1 spent a task collapsing                                 |

**Recommended: A, in that order.** The refactor commit must not change a single test, which is the
same guard that made Sprint 1's collapse safe (538 tests passed unmodified). If a test does change,
the refactor is wrong.

Note that `parse-filters.ts` and `search-params.ts` currently use the variable name `key` for the
_filter name_, which is about to become actively misleading. Renaming it to `name` inside those
loops is part of the refactor commit, not a separate cleanup.

### Decision 4 — is a scalar `key` allowed to collide with a range side?

`{ createdAt: dateRange(), from: text({ key: 'createdAtFrom' }) }` resolves two filters onto one
param.

**Recommended: it already throws**, via the `defineFilters` duplicate-key check added in `0.3.1`,
and no new code is needed. This decision exists so that the behavior is asserted deliberately rather
than discovered by a user; add the test.

### Decision 5 — what about `@filterbridge/tanstack`?

`toTanStackColumnFilters` maps filter names to column ids via its own `columnIds` option and never
touches URL param keys.

**Recommended: unaffected, with a test that says so** — the same call Sprint 1's task 2 made for
`toQueryDto`, which is also unaffected and also has a test saying so. The DTO keys stay the filter
names; a URL param key is a URL concern and does not belong in a backend payload.

---

## Acceptance criteria

- [ ] `text`, `select`, `multiSelect` and `boolean` accept `{ key }`
- [ ] `text` still rejects `{ default }` at the type level
- [ ] The 581 existing tests pass **unmodified** after the refactor commit and after the feature
      commit
- [ ] `grep` finds no file outside `param-keys.ts` deriving a param key from a filter name — the
      same verification Sprint 1 used, by grep and not by intention
- [ ] `parseFilters`, `toSearchParams`, `getFilterParamKeys`, `createFilterUrl`,
      `parseFiltersFromUrl`, `normalizeNextSearchParams` and `createNextFilterHref` all honour a
      custom scalar key — the last four for free, but asserted
- [ ] A round-trip test: parse → serialize → parse over a schema where every filter has a custom key
- [ ] `toQueryDto` and `@filterbridge/tanstack` are unaffected, asserted
- [ ] `defineFilters` throws on a scalar key colliding with another scalar and with a range side
- [ ] `docs/api/core.md`, `docs/api/next.md`, `packages/core/README.md` and CLAUDE.md §7 updated —
      §7 currently states that `text` takes no configuration at all
- [ ] A changeset on `core` and `next`

---

## Related

- [Sprint 1 task 2](../sprint-1/02-custom-range-keys.md) — the range half, and the decision that
  deferred this one
- [Sprint 0 task 1](../sprint-0/01-repeated-query-params.md) — what duplicated key knowledge cost
  last time
- [ADR-002 §4](../../decisions/002-default-values.md) — why `text` may not have a default, which
  constrains the shape of its new config argument
