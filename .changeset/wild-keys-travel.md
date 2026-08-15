---
'@filterbridge/core': minor
'@filterbridge/browser': minor
'@filterbridge/next': minor
---

Custom URL keys for `dateRange` and `numberRange`, and one place that derives them.

`dateRange` and `numberRange` now accept `{ keys }`, overriding the `From` / `To` / `Min` / `Max`
param names that were previously fixed:

```ts
const filters = defineFilters({
  createdAt: dateRange({ keys: { from: 'created_after', to: 'created_before' } }),
  amount: numberRange({ keys: { min: 'min_cents' } }),
})
// created_after=2026-01-01&created_before=2026-01-31&min_cents=100&amountMax=500
```

Either side may be given alone; the other stays derived. The key replaces the whole param name, so
`created_after` is reachable from a filter named `createdAt`. `toQueryDto` is deliberately
unaffected — the DTO is keyed by filter name, and a custom key is a URL concern.

Underneath, key derivation moved into `@filterbridge/core` and is exported as `filterParamKeys`,
`getFilterParamKeys`, `dateRangeParamKeys` and `numberRangeParamKeys`. It used to be spelled out
independently in four places across `core`, `browser` and `next` — the same duplicated-knowledge
shape that let `core` and `next` disagree about repeated query params before `0.2.0`.
`getFilterParamKeys` still exports from `@filterbridge/browser` with an unchanged name, signature
and return type.

**Behavior change:** `defineFilters` now throws when two filters resolve to the same URL param key.

```ts
defineFilters({
  createdAtFrom: text(),
  createdAt: dateRange(), // also writes createdAtFrom
})
// Error: [filterbridge] defineFilters(): filters "createdAtFrom" and "createdAt"
// both use the URL param "createdAtFrom".
```

This is reachable without any `keys` override and was reachable in `0.2.0`, where `toSearchParams`
silently let the last writer win and one of the two filters round-tripped to a value it never held.
Such a schema was never working, but it did not throw before and it does now — rename one of the
filters, or give one an explicit `keys` override. A schema with no collision is unaffected, and a
schema with no `keys` produces byte-identical URLs to `0.2.0`.
