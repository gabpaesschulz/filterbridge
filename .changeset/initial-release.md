---
"@filterbridge/core": minor
"@filterbridge/react": minor
"@filterbridge/browser": minor
"@filterbridge/tanstack": minor
"@filterbridge/next": minor
---

Initial experimental release of FilterBridge.

- `@filterbridge/core`: schema-first filter definitions, parsing, URL serialization and backend DTO generation
- `@filterbridge/react`: React state hook (`useFilterBridge`) for FilterBridge schemas
- `@filterbridge/browser`: browser URL synchronization helpers (`createFilterUrl`, `pushUrlFilters`, `replaceUrlFilters`)
- `@filterbridge/tanstack`: TanStack Table adapter (`toTanStackColumnFilters`, `fromTanStackColumnFilters`, `filterBridgeFilterFns`)
- `@filterbridge/next`: Next.js App Router search params adapter (`parseNextSearchParams`, `createNextFilterHref`)
