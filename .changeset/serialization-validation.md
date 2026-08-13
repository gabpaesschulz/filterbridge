---
'@filterbridge/core': patch
---

Validate `select` and `multiSelect` against the schema when serializing, not only when parsing.

`parseFilters` checked values against a filter's `options`; `toSearchParams` and `toQueryDto` did
not. A value the schema forbids went straight into the URL and into the backend DTO, then vanished
when the URL was read back — so `parseFilters(schema, toSearchParams(schema, state))` was not
`state`, and the loss was silent.

- `toSearchParams` now omits a `select` value that is not a string listed in `options`, drops the
  invalid entries of a `multiSelect`, and omits the key when none survive.
- `toQueryDto` applies the identical rules, including the type check on `select` that it previously
  lacked entirely (`dto[key] = value` copied through a number or an object as-is).
- The membership rule now lives in one module and is used by the parser and both serializers, so
  the three directions cannot drift apart again.
- A dropped value is reported through `console.warn` when `process.env.NODE_ENV !== 'production'`.
  Serialization never throws: it runs inside `useFilterBridge`'s render path, where a bad filter
  value must degrade to a missing key rather than to a blank page.

**Behavior change:** callers passing values outside a filter's `options` currently see them in the
URL and in the DTO; after this they will not. That output is already broken — it does not survive a
re-parse — so no correct integration depends on it, but code reading `toQueryDto` output directly
will see those keys disappear.
