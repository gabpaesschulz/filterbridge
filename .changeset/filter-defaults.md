---
'@filterbridge/core': minor
---

Add per-filter default values and `getDefaultFilterState`

Every filter factory now takes an optional configuration object as its last argument:

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
  pageSize: select(['25', '50', '100'], { default: '25' }),
  createdAt: dateRange({ default: { from: '2026-01-01' } }),
})
```

A default is used by `parseFilters` when the key is absent from the input **or** present but
invalid, and it is **omitted** by `toSearchParams` and `toQueryDto` — so a page sitting at its
default state has no query string at all, and the round trip still holds:
`parseFilters(schema, toSearchParams(schema, state))` gives back the same state.

`getDefaultFilterState(schema)` is a new export returning the state a schema starts from — the same
object `parseFilters(schema, {})` produces, without needing an input.

`select` and `multiSelect` validate their default against `options` when the schema is defined and
**throw** if it does not belong. This is a source-level typo that fails identically on every run, so
it is caught at definition rather than silently parsed to `undefined` later — unlike the serializers,
which drop a bad runtime value and warn.

Two consequences of omitting defaults from the URL, documented in
[`docs/api/core.md`](https://github.com/gabpaesschulz/filterbridge/blob/main/docs/api/core.md#default-values):

- Changing a default in code changes what old bookmarks mean. A link saved as `/invoices` shows
  whatever the default is today.
- "No value" is unreachable through the URL for a filter that has a default. Model a third state as
  an explicit option (`select(['all', 'active', 'archived'], { default: 'active' })`) rather than as
  the absence of a boolean.

Schemas without defaults are unaffected — parsing, serialization, and DTO output are byte-identical
to `0.1.0`, verified by the existing suite passing unmodified.

Also exported: `FilterConfig<TValue>`, and the `DateRangeValue` / `NumberRangeValue` state shapes
that `dateRange` and `numberRange` already used inline.
