# ADR-002: Per-filter default values

**Date:** 2026-08-13
**Status:** accepted
**Supersedes:** nothing. Extends [ADR-001](./001-project-architecture.md).

## Context

CLAUDE.md §7 and §8 described default values from the beginning and nothing implemented them. Sprint 0 added them. The feature turned out to touch every code path in core plus the React hook, and each of the decisions below was taken separately, some of them after the previous one had already shipped inside the sprint. This record exists so that `v1.0` inherits the reasoning and not just the result.

Nothing here was ever published: the whole feature ships for the first time in `0.2.0`.

## Decisions

### 1. A default is omitted from the URL (option B)

A filter sitting at its default emits no query param. `parseFilters` puts it back when the param is missing or invalid.

The alternative — always serialize — was rejected because it makes `?archived=false&status=all` the landing URL of every admin page, and clean default URLs are the reason to want defaults at all.

**Cost, accepted knowingly:** a URL no longer fully describes the state. Changing a default in code changes what old bookmarks mean, and "no value" is not expressible through the URL for a filter that has one.

### 2. `toQueryDto` carries defaults; `toSearchParams` does not

The two outputs deliberately carry different bytes.

Omitting a default from the URL is **compression with a guaranteed decompressor**: the URL is read back by `parseFilters`, which restores it. Nothing is lost.

The DTO has no such closure. It leaves for a backend that does not run FilterBridge and cannot know the schema, so an omitted default is **loss**, not compression. Before this was fixed, a page sitting at `status: 'paid'` rendered "paid" in the control while the backend, handed `{}`, returned every row — pending and failed included. That is the exact class of inconsistency the library exists to prevent, so it was treated as a release blocker rather than as a documentation problem.

`toQueryDto` therefore applies the same fallback rule as `parseFilters`: absent, empty or invalid becomes the default. That is what makes `toQueryDto(state)` equal `toQueryDto(parseFilters(schema, toSearchParams(schema, state)))` for every state.

The earlier escape hatch — telling callers to merge `getDefaultFilterState` into the DTO themselves — was rejected: the dangerous behavior was the default one, and the fix was opt-in.

### 3. Hook state always contains the defaults

`useFilterBridge` layers every state write over `getDefaultFilterState(schema)`. The invariant: **`bridge.state` is always in the range of `parseFilters`** — there is always some URL that parses to it.

Without it, `{}` is reachable through `reset()`, `clear(key)`, `set(key, undefined)` and `syncState({})`, and `{}` is not a state any query string can express. Fixing decision 2 alone would have moved the inconsistency rather than removed it: the DTO would say `paid` while the control read "Any".

Consequences, all intended:

- `clear(key)` on a defaulted filter means "back to the default", not "remove". Absent is not expressible, so this is the only honest meaning available. It is durable — control, URL, reload and DTO all agree.
- `reset()` lands on the defaults when the schema has any, and on `{}` when it does not. "Back to the baseline" is one operation whose meaning follows from the schema.
- There is no separate `resetToDefaults()`. It was considered and dropped: with this rule `reset()` already is it.
- A schema with no defaults is unaffected — `getDefaultFilterState` returns `{}`, so the merge is the identity.

Two alternatives were rejected. Making only `reset()` restore defaults fixes one instance and leaves `clear()` — which is bound to every clear affordance in a typical UI, and therefore far more frequent — still producing unreachable state. Adding `resetToDefaults()` alongside an unchanged `reset()` documents a footgun instead of removing it, and leaves the shortest name attached to the wrong behavior.

### 4. Only filters with an enumerable value space accept a default

`select`, `multiSelect` and `boolean` accept `{ default }`. `text`, `dateRange` and `numberRange` do not — the restriction is a type error at the call site, not a runtime check. (`dateRange` and `numberRange` gained a configuration object in `0.3.1`, but it carries only `keys`; there is still no way to spell a default on them.)

The criterion is deliberately stated as a **property, not a list**, so a future builder can be judged against it without reopening this: _a filter may declare a default when its value space is a fixed, enumerable set._

What that property is standing in for is whether a value can pass through "empty" as an intermediate step of a single editing gesture. Under decision 3, clearing returns a filter to its default — coherent for a discrete choice, hostile for continuous editing:

- `text` — free text is edited character by character. A default would repopulate the input while the user was still backspacing through it. There is no clean mitigation inside the library: pushing local input state onto every consumer is the repeated glue this project exists to remove, and making `''` a distinct value would require representing it in the URL, which contradicts the empty-value normalization the same sprint introduced.
- `numberRange` — the same mechanism. Changing `150` to `20` passes through `''`, so the field would snap back mid-edit. No defensible use case survived scrutiny either: a minimum of `0` on a positive quantity filters nothing, and the plausible numeric default of an admin screen is a page size, which is a discrete choice.
- `dateRange` — the decisive argument is not the interaction but that **no literal date default is correct**. `from: '2026-01-01'` means something different every month and goes stale with nobody noticing. The case it would have served, "last 30 days", is a discrete choice and belongs in `select(['7d', '30d', '90d'], { default: '30d' })` — which also dodges the staleness entirely.

`multiSelect` is a knowing middle ground. Unchecking the last box takes the array to `[]` and restores the default selection, which is mildly surprising — but `[]` there is the destination of a discrete click, not a step on the way to somewhere else.

Narrowing was done before the first publish because it is free now and irreversible in the wrong direction: widening an API later is always possible, narrowing it is not.

### 5. `InferFilterState` keeps every field optional — revisit at `v1.0`

A filter with a default is never absent from a parsed state, and after decision 3 it is never absent from hook state either. It could therefore be typed as required rather than optional, which would be a materially nicer API: no `?.` and no `?? fallback` on a field that cannot be missing.

It is deliberately **not** done now. Narrowing optionality is a breaking type change, it needs a conditional type over the schema that CLAUDE.md §10 would call clever rather than simple, and it deserves its own release.

**Input for `v1.0`:** decision 3 strengthens this case rather than weakening it. Before it, "never absent" held only for values that had been through `parseFilters`; a hook user could still hold `{}`. Now it holds for hook state too, so the type would be telling the truth in every path the library controls. Whoever picks this up should treat the required-field version as the default choice and look for reasons against, not the other way round.

## Status of the costs

Stated together, because the point of this record is that they were accumulated deliberately and not discovered one at a time:

| Cost                                                | Where it lands                                          |
| --------------------------------------------------- | ------------------------------------------------------- |
| A URL no longer fully describes the state           | Bookmarks change meaning when a default changes in code |
| "No value" is unreachable for a defaulted filter    | Model the extra state as an explicit option             |
| `clear()` changed meaning                           | "Back to the default" for defaulted filters only        |
| The DTO needed a merge the URL does not             | Two outputs, deliberately different bytes               |
| `InferFilterState` is less precise than it could be | Deferred to `v1.0`, see above                           |

## Consequences

- Three core functions and the React hook all consult the schema's defaults; the rule lives in `packages/core/src/defaults.ts` and nowhere else.
- `isAtDefault` is public, so adapters and chip UIs use the same comparison the serializers use instead of re-implementing it.
- The invariant in decision 3 is property-tested over generated sequences of hook operations, not just asserted on examples.
