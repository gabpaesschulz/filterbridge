---
'@filterbridge/core': patch
---

Schema validation now fails at definition time instead of guessing.

`0.3.0` was never published — it and this release ship together, so read the two
CHANGELOG sections as one delta from `0.2.0`.

Four checks now throw while a schema is being defined. Because `defineFilters` and the
builders run at module load, a schema that trips one of them fails at import, which under
a server framework means the render fails rather than a filter misbehaving. Listed by
whether a schema written against `0.2.0` can reach them:

**Can break a schema that works in `0.2.0`:**

- **Two filters resolving to the same URL param key** (already in `0.3.0`). `{ createdAtFrom: text(), createdAt: dateRange() }` collides with no custom key involved. In `0.2.0` `toSearchParams` let the last writer win, so one of the two filters round-tripped to a value it never held — the schema was never working, it just failed quietly. Rename one filter, or give one an explicit `keys` override.
- **A filter whose `_kind` is not one of the six built-in kinds.** `filterParamKeys` used to answer an unrecognised kind with `[name]`, which is wrong for anything occupying two params, and `getFilterParamKeys` feeds the URL cleanup in `@filterbridge/browser` — an unreported key stays in the URL forever. Only reachable by building a filter object by hand or deserialising one; every builder produces a valid kind.

**Cannot break a `0.2.0` schema** — both are new validation on `keys`, which did not exist before `0.3.0`, so reaching them requires writing `0.3.0` code:

- **A `keys` override with leading or trailing whitespace.** `dateRange({ keys: { from: ' created_after' } })` round-trips inside FilterBridge but writes `+created_after+` to the URL, so the backend the override exists to match matches nothing. Rejected rather than trimmed, so the param name in the source stays the param name on the wire.
- **A `keys` override naming a side the builder does not have.** `dateRange({ keys: { form: 'x' } })` was dropped silently and left the filter reading `createdAtFrom`, surfacing later as an empty filter on a URL that looked correct. TypeScript already rejects this in an object literal; the check covers a cast, a loosely typed variable, and a JavaScript caller.

Also: the error for a range colliding with itself — `dateRange({ keys: { from: 'when', to: 'when' } })` — used to name the same filter twice and tell you to rename one of them or add the `keys` override you had just written. It now says which two sides clash, naming `keys.min`/`keys.max` for a `numberRange` and `keys.from`/`keys.to` for a `dateRange`.
