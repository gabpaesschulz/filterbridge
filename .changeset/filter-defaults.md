---
'@filterbridge/core': minor
'@filterbridge/react': minor
---

Add per-filter default values, `getDefaultFilterState` and `isAtDefault`

`select`, `multiSelect` and `boolean` now take an optional configuration object as their last
argument:

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
  pageSize: select(['25', '50', '100'], { default: '25' }),
  archived: boolean({ default: false }),
})
```

A default is used by `parseFilters` when the key is absent from the input **or** present but
invalid, and it is **omitted** by `toSearchParams` — so a page sitting at its default state has no
query string at all, and the round trip still holds.

**Only filters whose value space is a fixed, enumerable set accept a default.** `text()`,
`dateRange()` and `numberRange()` take no configuration, and passing one is a type error. Clearing a
filter returns it to its default, which is coherent for a discrete choice and hostile for continuous
editing — a text or number input would repopulate itself while the user was still backspacing
through it. A literal date default is wrong for a different reason: `'2026-01-01'` means something
else every month. Express those as discrete choices instead:

```ts
period: select(['7d', '30d', '90d'], { default: '30d' })
```

### The DTO carries defaults; the URL does not

`toSearchParams` omits a value equal to its default. `toQueryDto` **includes** it. The two outputs
deliberately carry different bytes:

- Omitting a default from the URL is compression with a guaranteed decompressor — `parseFilters`
  puts it back on the way in. Nothing is lost.
- The DTO leaves for a backend that does not run FilterBridge and cannot know the schema, so an
  omitted default is gone. A page at `status: 'paid'` would render "paid" while the backend, handed
  `{}`, returned every row.

`toQueryDto` applies the same fallback rule as `parseFilters` — absent, empty or invalid becomes the
default — so `toQueryDto(state)` always equals
`toQueryDto(parseFilters(schema, toSearchParams(schema, state)))`.

### `useFilterBridge` keeps state representable

The hook layers every state write over the schema defaults, so `bridge.state` is always a state some
URL parses to. Without that, `{}` is reachable through `reset()`, `clear()` and `syncState()`, and
`{}` is not expressible as a query string — the UI would show a filter as cleared while the URL and
the DTO both read it as its default.

- `clear(key)` on a filter **with** a default returns it to that default. There is no "absent" to
  return to. On a filter without one it removes the key, exactly as before.
- `reset()` returns to the page's baseline: `{}` for a schema with no defaults, the defaults for a
  schema that has them. There is no separate `resetToDefaults()` — that is what `reset()` now is.
- `activeFilterCount` does not count a filter sitting at its default, so an untouched page reads
  "0 active filters" instead of counting filters nobody has touched.

### Also added

- `getDefaultFilterState(schema)` — the state a schema starts from, the same object
  `parseFilters(schema, {})` produces.
- `isAtDefault(filter, value)` — the comparison the serializers use, exported so adapters and
  active-filter-chip UIs do not re-implement it.
- `select` and `multiSelect` validate their default against `options` at schema definition and
  **throw** if it does not belong. A default is static configuration, so a typo fails identically on
  every run and is worth catching at definition rather than silently parsing to `undefined`.
- `FilterConfig<TValue>`, and the `DateRangeValue` / `NumberRangeValue` state shapes that
  `dateRange` and `numberRange` already used inline.

Schemas without defaults are unaffected: parsing, serialization, DTO output and hook behavior are
byte-identical to `0.1.0`. The cost of omitting defaults from the URL — bookmarks whose meaning
follows the code, and "no value" being unreachable for a defaulted filter — is documented in
[`docs/api/core.md`](https://github.com/gabpaesschulz/filterbridge/blob/main/docs/api/core.md#default-values)
and recorded in full in `docs/decisions/002-default-values.md`.
