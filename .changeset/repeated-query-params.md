---
'@filterbridge/core': patch
---

Fix repeated query params being silently dropped in `parseFilters`.

`normalizeInput` flattened `URLSearchParams` with `forEach`, so a key appearing more than once kept
only its last value. `tags=a&tags=b` parsed to `['b']` instead of `['a', 'b']`, silently discarding
user-selected values. It now collects every value per key with `getAll`.

- `multiSelect` accepts repeated params, comma-separated values, and a mix of both
  (`tags=a,b&tags=c` → `['a', 'b', 'c']`). Invalid values are still discarded against `options`.
- Single-valued filters (`text`, `select`, `boolean`, and each side of `dateRange` / `numberRange`)
  take the first occurrence, matching the behavior `@filterbridge/next` already documented. These
  inputs previously produced `undefined`.

This closes a state mismatch where a Next.js app parsing on the server with `@filterbridge/next` and
re-parsing on the client with `@filterbridge/core` got different results from the same URL.

Plain-record input and non-repeated `URLSearchParams` are unaffected.
