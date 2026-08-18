# @filterbridge/browser

## 0.3.1

### Patch Changes

- Updated dependencies [dc3d01f]
  - @filterbridge/core@0.3.1

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

## 0.2.0

### Minor Changes

- Add `usePopstateSync`, in a new `@filterbridge/browser/react` entry point. Back/forward navigation
  now restores the filter UI instead of leaving it out of sync with the URL.

  Nothing listened for `popstate`, so pressing Back changed the address bar while the UI kept the old
  filters — the two disagreed until a full reload.

  ```tsx
  import { parseFiltersFromUrl, pushUrlFilters } from '@filterbridge/browser'
  import { usePopstateSync } from '@filterbridge/browser/react'

  const bridge = useFilterBridge(orderFilters, {
    initialState: parseFiltersFromUrl(orderFilters),
    onChange: (state) => pushUrlFilters(orderFilters, state),
  })

  usePopstateSync(orderFilters, bridge.syncState)
  ```

  On each `popstate` it re-parses `window.location.search` with the schema and hands the result to
  `onState`. It does not fire on mount, removes its listener on unmount, and is a no-op when `window`
  is undefined, matching the rest of the package.

  Pair it with `useFilterBridge().syncState` specifically — that method applies state **without**
  firing `onChange`, which is what stops the write-back that put the filters in the URL from running
  again on every Back press.

  **Packaging:** React is an **optional** peer dependency (`peerDependenciesMeta.react.optional`).
  Only the `/react` subpath imports it, so `@filterbridge/browser` remains importable in plain Node or
  any non-React app. Both entry points ship ESM, CJS and type declarations.

  Note that back/forward only has somewhere to go if filter changes are written with `pushUrlFilters`;
  `replaceUrlFilters` keeps a single history entry.

  Additive — no existing behavior changes.

### Patch Changes

- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
- Updated dependencies [e5f5036]
  - @filterbridge/core@0.2.0

## 0.1.0

### Initial Release

- 2896dad: Initial experimental release of FilterBridge.
  - `@filterbridge/core`: schema-first filter definitions, parsing, URL serialization and backend DTO generation
  - `@filterbridge/react`: React state hook (`useFilterBridge`) for FilterBridge schemas
  - `@filterbridge/browser`: browser URL synchronization helpers (`createFilterUrl`, `pushUrlFilters`, `replaceUrlFilters`)
  - `@filterbridge/tanstack`: TanStack Table adapter (`toTanStackColumnFilters`, `fromTanStackColumnFilters`, `filterBridgeFilterFns`)
  - `@filterbridge/next`: Next.js App Router search params adapter (`parseNextSearchParams`, `createNextFilterHref`)
