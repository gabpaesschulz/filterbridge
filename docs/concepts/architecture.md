# Architecture

## Overview

FilterBridge is split into five packages and one demo app:

```
filterbridge/
  packages/
    core/       — @filterbridge/core
    react/      — @filterbridge/react
    browser/    — @filterbridge/browser
    tanstack/   — @filterbridge/tanstack
    next/       — @filterbridge/next
  apps/
    demo/       — local Vite + React demo, not published
```

The packages have a strict one-way dependency:

```
@filterbridge/react    →  @filterbridge/core
@filterbridge/browser  →  @filterbridge/core
@filterbridge/tanstack →  @filterbridge/core
@filterbridge/next     →  @filterbridge/core, @filterbridge/browser
@filterbridge/core     →  (no dependencies)
```

Core never imports React or browser APIs. The react, browser, and tanstack packages each depend on core only. The next package depends on both core and browser.

Two packages have **optional** peer dependencies, which is how they stay usable without the thing
they adapt:

```
@filterbridge/browser  →  react            (optional peer, only for the /react subpath)
@filterbridge/tanstack →  @tanstack/react-table  (optional peer, only for filterBridgeFilterFns)
```

`@filterbridge/browser` is the only package with two entry points. The root entry never imports
React, so it works in plain Node, a worker, or a non-React app; `@filterbridge/browser/react`
contains the single React hook. Splitting them is what lets React be optional rather than required
of everyone who wants to read filters out of a URL:

```
@filterbridge/browser          →  dist/index.js  dist/index.cjs  (+ .d.ts / .d.cts)
@filterbridge/browser/react    →  dist/react.js  dist/react.cjs  (+ .d.ts / .d.cts)
```

The split is verified rather than assumed: the `.smoke/` suite installs the packed tarballs and
imports both entries in ESM and CJS, and the root entry is additionally checked in a project with
no React installed at all.

---

## @filterbridge/core

Pure TypeScript. No runtime dependencies.

Responsibilities:
- Define the filter schema DSL (`defineFilters`, `text`, `select`, etc.)
- Parse untrusted input into typed filter state (`parseFilters`)
- Serialize typed state into `URLSearchParams` (`toSearchParams`)
- Convert typed state into a backend-ready DTO (`toQueryDto`)
- Resolve per-filter defaults (`getDefaultFilterState`, `isAtDefault`)
- Export TypeScript types for schema, state, and filter definitions

The core functions are pure: given the same schema and input, they always produce the same output. They have no side effects, no global state, no timers, and no async behavior.

One deliberate asymmetry: `toSearchParams` omits a value equal to its filter's default and `toQueryDto` includes it. Omitting from the URL is safe because `parseFilters` reads it back and restores it; the DTO leaves for a backend that cannot know the schema, where an omitted default is loss rather than compression. See [ADR-002](../decisions/002-default-values.md).

**Entry point:** `packages/core/src/index.ts`

**Source files:**
```
filter-types.ts     — interface definitions for all filter types
filter-builders.ts  — text(), select(), boolean(), etc.
define-filters.ts   — defineFilters() identity function with type inference
infer.ts            — InferFilterState and FilterStateValue utility types
defaults.ts         — filterDefault(), isAtDefault(), getDefaultFilterState()
filter-validation.ts— the single option-membership rule, shared by parse and
                      both serializers, plus the dev-only dropped-value warning
parse-filters.ts    — parseFilters() implementation
search-params.ts    — toSearchParams() implementation
query-dto.ts        — toQueryDto() implementation
```

`filter-validation.ts` and `defaults.ts` are internal — not re-exported from `index.ts` beyond
`getDefaultFilterState` and `isAtDefault`. The point of both is that one rule lives in one place:
before them, `parseFilters` validated against `options` and the two serializers did not, so the
same schema was enforced in one of three directions.

**Build output:** ESM (`dist/index.js`) and CJS (`dist/index.cjs`), with TypeScript declarations (`dist/index.d.ts`).

---

## @filterbridge/react

React adapter. Depends on `@filterbridge/core`. Peer dependency on React 18+.

Responsibilities:
- Manage local filter state via `useFilterBridge`
- Expose `set`, `setMany`, `clear`, `reset`, `resetToInitial` for state updates
- Accept externally-owned state via `syncState`, without firing `onChange`
- Derive `hasActiveFilters` and `activeFilterCount`, ignoring filters at their default
- Delegate `toQueryDto` and `toSearchParams` to core
- Keep state clean (no empty values) and **representable** (always a state some URL parses to)

The representability rule is what keeps the three outputs in agreement: every write is layered over
the schema defaults, so `{}` is unreachable for a schema that declares any. Without it the UI could
render a filter as cleared while the URL and the DTO both read it as its default. See
[ADR-002](../decisions/002-default-values.md).

`syncState` deliberately does not fire `onChange`. The usual caller writes `onChange` back to the
URL, so firing it on an externally-driven update would turn "the URL changed, adopt it" into "adopt
it, then write it back", which loops.

The hook does not perform URL synchronization, routing, or data fetching. Those responsibilities belong to the application layer.

**Entry point:** `packages/react/src/index.ts`

**Source files:**
```
types.ts              — UseFilterBridgeOptions and UseFilterBridgeReturn types
clean-state.ts        — cleanFilterState() removes empty values
active-filters.ts     — countActiveFilters() counts active keys
use-filter-bridge.ts  — useFilterBridge() hook implementation
```

**Build output:** ESM and CJS with declarations. React is marked as external (not bundled).

---

## @filterbridge/browser

Browser URL helpers. Depends on `@filterbridge/core`. React is an **optional** peer dependency, imported only by the `/react` subpath — the root entry works in any browser or server context without it.

Responsibilities:
- Enumerate URL search-param keys produced by a schema (`getFilterParamKeys`)
- Parse filter state from URL strings, `URL`, `URLSearchParams`, or location-like objects (`parseFiltersFromUrl`)
- Build a URL path string from schema and state, preserving non-filter params (`createFilterUrl`)
- Push or replace browser history state (`replaceUrlFilters`, `pushUrlFilters`)
- Adopt the URL on back/forward navigation (`usePopstateSync`, `/react` subpath only)

All helpers degrade gracefully outside a browser context (SSR-safe).

**Entry points:** `packages/browser/src/index.ts` and `packages/browser/src/react.ts`

**Source files:**
```
types.ts                  — UrlLike, CreateFilterUrlOptions, SyncUrlOptions,
                            UsePopstateSyncOptions
filter-param-keys.ts      — getFilterParamKeys()
parse-filters-from-url.ts — parseFiltersFromUrl()
create-filter-url.ts      — createFilterUrl()
sync-url.ts               — replaceUrlFilters(), pushUrlFilters()
use-popstate-sync.ts      — usePopstateSync()          (imports react)
react.ts                  — the /react entry point
```

**Build output:** ESM and CJS with declarations.

---

## apps/demo

A Vite + React single-page application that demonstrates the library. Not a package — never published.

The demo defines a realistic invoice filter schema, connects it to a UI using `useFilterBridge`, and synchronizes filter state with the browser URL using `@filterbridge/browser`. An output panel shows the raw state, backend DTO, and URLSearchParams updating in real time. Reloading the page restores filters from the URL.

The demo is the integration test for the library. It demonstrates the full stack: `useFilterBridge`, URL sync via `@filterbridge/browser`, TanStack column filters via `@filterbridge/tanstack`, and client-side table filtering. If the demo works as expected, all four packages are working together correctly.

---

## Data flow

For a user typing in a search input:

```
User types "acme"
  → bridge.set('search', 'acme')
  → cleanFilterState({ ...current, search: 'acme' })
  → setState(cleaned)
  → React re-renders
  → bridge.state.search === 'acme'
  → bridge.toQueryDto() returns { search: 'acme', ...other active filters }
  → bridge.toSearchParams() returns URLSearchParams with search=acme&...
  → onChange({ search: 'acme', ... }) called
```

For loading filters from a URL on page load (with `@filterbridge/browser`):

```
window.location.search
  → parseFiltersFromUrl(schema)    — delegates to parseFilters internally
  → typed state object
  → passed as initialState to useFilterBridge
  → bridge.state reflects parsed values
```

For writing filters back to the URL on change:

```
bridge.onChange(state)
  → replaceUrlFilters(schema, state)
  → reads window.location.search to preserve non-filter params
  → createFilterUrl(schema, state, { currentSearch })
  → window.history.replaceState(historyState, "", newUrl)
```

---

## @filterbridge/tanstack

TanStack Table adapter. Depends on `@filterbridge/core`. TanStack Table (`@tanstack/react-table`) is an optional peer dependency — it is only needed at runtime if you use `filterBridgeFilterFns` with `useReactTable`.

Responsibilities:
- Convert FilterBridge state to TanStack `columnFilters` format (`toTanStackColumnFilters`)
- Convert TanStack `columnFilters` back to FilterBridge state (`fromTanStackColumnFilters`)
- Provide simple client-side filter functions for `useReactTable` (`filterBridgeFilterFns`)

This package does not render a table, wrap `useReactTable`, or manage React state. It is a pure state-format adapter.

**Entry point:** `packages/tanstack/src/index.ts`

**Source files:**
```
types.ts               — TanStackColumnFilter, TanStackColumnFiltersState, options types
utils.ts               — buildReverseColumnIdMap(), isEmpty()
to-column-filters.ts   — toTanStackColumnFilters()
from-column-filters.ts — fromTanStackColumnFilters()
filter-fns.ts          — filterBridgeFilterFns object
```

**Build output:** ESM and CJS with declarations. TanStack Table is not bundled.

---

## @filterbridge/next

Next.js App Router adapter. Depends on `@filterbridge/core` and `@filterbridge/browser`.
Does not import from Next.js at runtime — accepts Next-shaped inputs by structural typing.

Responsibilities:
- Convert Next.js `searchParams` (plain record or Promise) into typed filter state (`parseNextSearchParams`, `parseNextSearchParamsAsync`)
- Normalize Next.js-specific input formats for core parsing (`normalizeNextSearchParams`)
- Build hrefs for `<Link>` or `router.push()` (`createNextFilterHref`)

Server-safe: does not access `window`, `document`, or Next.js runtime APIs.

**Entry point:** `packages/next/src/index.ts`

**Source files:**
```
types.ts                        — NextSearchParamsInput, MaybePromise, CreateNextFilterHrefOptions
normalize-next-search-params.ts — normalizeNextSearchParams(), inputToRawRecord()
parse-next-search-params.ts     — parseNextSearchParams(), parseNextSearchParamsAsync()
create-next-filter-href.ts      — createNextFilterHref()
```

**Build output:** ESM and CJS with declarations.

---

## Planned future packages

## Design decisions

**Why are core functions pure?**

Pure functions are easy to test, easy to reason about, and work in any environment (browser, server, worker). Adding stateful behavior to core would make it harder to use in server components, edge functions, or non-React contexts.

**Why is URL sync a separate package and not built into the React hook?**

The generic React hook manages in-memory state only. URL synchronization requires browser globals (`window.history`) and carries different environment assumptions than the hook itself. Keeping them separate means core and react both work in SSR contexts without modification. The browser package is an explicit layer you opt into.

**Why does `reset()` go to `{}` instead of `initialState`?**

`initialState` is a one-time initialization value, not a "default" baseline. Resetting to `initialState` would require storing it through the hook's lifetime and makes the semantics less clear. If you want "reset to defaults", you can call `setMany(yourDefaultState)` explicitly. This may be revisited in a later wave.

**Why no Zod / Valibot?**

Filter parsing is simple enough that a validation library adds more complexity than it removes. The parsing rules are fixed by the filter type, not user-configurable. Adding Zod as a dependency would increase bundle size and add a learning barrier without a clear benefit for the MVP use case.
