---
'@filterbridge/core': minor
'@filterbridge/react': minor
---

`activeFilterCount` no longer counts a filter that is sitting at its schema default.

The counter answers "has the user changed anything?", and with defaults the baseline is the default,
not the empty state. Counting them opened every untouched page reading "3 active filters" with the
Reset button enabled — for filters that emit no query param and that nobody had touched.

```ts
const schema = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
  archived: boolean({ default: false }),
})

const bridge = useFilterBridge(schema, { initialState: parseFiltersFromUrl(schema) })

bridge.activeFilterCount // 0 — was 2
bridge.hasActiveFilters  // false — was true

bridge.set('status', 'failed')
bridge.activeFilterCount // 1
```

The count is now the number of filters the query string carries, which is the same question stated
two ways — so the two cannot drift apart.

`isAtDefault(filter, value)` is exported from `@filterbridge/core` to make that possible: it is the
comparison the serializers already use, and re-implementing it in `@filterbridge/react` is exactly
the drift this release closed for option validation. It is also what an active-filter-chips UI needs
in order to show only the filters the user actually set.

**Behavior change, but only for schemas that declare defaults** — which are new in this release, so
nothing published depends on the old counting. Schemas without defaults count exactly as before.
