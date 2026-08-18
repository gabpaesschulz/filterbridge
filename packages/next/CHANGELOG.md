# @filterbridge/next

## 0.4.0

### Minor Changes

- bdb8195: `text`, `select`, `multiSelect` and `boolean` accept a `key` option, renaming the
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

### Patch Changes

- 0c7441b: Internal: every filter kind now derives its URL param key through
  `packages/core/src/param-keys.ts`, not just the two range kinds.

  No behaviour change — for a scalar filter the derivation is the identity. `core`
  gains one export, `scalarParamKey`, for the same reason `dateRangeParamKeys` is
  exported: `@filterbridge/next` needs it inside its own `switch`.

- Updated dependencies [f1d4667]
- Updated dependencies [bdb8195]
- Updated dependencies [0c7441b]
  - @filterbridge/browser@0.4.0
  - @filterbridge/core@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies [dc3d01f]
  - @filterbridge/core@0.3.1
  - @filterbridge/browser@0.3.1

## 0.3.0

### Minor Changes

- c218ac1: Custom URL keys for `dateRange` and `numberRange`, and one place that derives them.

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

### Patch Changes

- Updated dependencies [c218ac1]
  - @filterbridge/core@0.3.0
  - @filterbridge/browser@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
- Updated dependencies
- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
  - @filterbridge/core@0.2.0
  - @filterbridge/browser@0.2.0

## 0.1.0

### Initial Release

- 2896dad: Initial experimental release of FilterBridge.
  - `@filterbridge/core`: schema-first filter definitions, parsing, URL serialization and backend DTO generation
  - `@filterbridge/react`: React state hook (`useFilterBridge`) for FilterBridge schemas
  - `@filterbridge/browser`: browser URL synchronization helpers (`createFilterUrl`, `pushUrlFilters`, `replaceUrlFilters`)
  - `@filterbridge/tanstack`: TanStack Table adapter (`toTanStackColumnFilters`, `fromTanStackColumnFilters`, `filterBridgeFilterFns`)
  - `@filterbridge/next`: Next.js App Router search params adapter (`parseNextSearchParams`, `createNextFilterHref`)
