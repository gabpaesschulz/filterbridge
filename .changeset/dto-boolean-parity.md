---
'@filterbridge/core': patch
---

Type-check `boolean` in `toQueryDto`, matching `toSearchParams`.

`toSearchParams` required an actual boolean; `toQueryDto` assigned whatever was in the slot. State
arriving from `JSON.parse`, `localStorage` or a cast as `{ active: 'true' }` therefore vanished from
the URL and reached the backend as the string `"true"` — the two serializers disagreed about the
same state, which is exactly the inconsistency `parseFilters`/`toSearchParams` validation closed for
`select` and `multiSelect`.

Found by the round-trip property test, not by hand: `toQueryDto(state)` must equal
`toQueryDto(parseFilters(schema, toSearchParams(schema, state)))` for every generated state, and
`boolean` was the last filter type where it did not.

**Behavior change:** a non-boolean in a `boolean` slot is now omitted from the DTO instead of being
copied through.
