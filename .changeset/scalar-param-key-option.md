---
'@filterbridge/core': minor
'@filterbridge/next': minor
---

`text`, `select`, `multiSelect` and `boolean` accept a `key` option, renaming the
URL param they read and write:

```ts
const filters = defineFilters({
  search: text({ key: 'q' }),
  status: select(['pending', 'paid'] as const, { key: 'st' }),
  archived: boolean({ key: 'is_archived' }),
})

toSearchParams(filters, { search: 'invoice', archived: false }).toString()
// q=invoice&is_archived=false
```

`key` for a filter occupying one param, `keys` for a range occupying two — the
range option was named in the plural in `0.3.1` so this could be the singular.

Notes:

- The state and the DTO are still keyed by **filter name**. `key` renames the URL
  param, not the field.
- A key replaces the name rather than aliasing it: once `search` writes `q`, a URL
  carrying `search=invoice` parses to nothing.
- `defineFilters` throws when a key collides with another filter's param, as it
  already did for ranges.
- Empty and whitespace-padded keys throw at definition time, matching `keys`.
- `text` accepts `{ key }` and still rejects `{ default }` at the type level
  (ADR-002 §4).

`@filterbridge/core` gains `scalarParamKey`, and the `ParamKeyConfig` and
`TextConfig` types. `@filterbridge/browser` and `@filterbridge/next` follow the
override with no API change of their own.
