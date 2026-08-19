# CLAUDE.md — FilterBridge Project Context

> **Purpose:** this file is the project-level reference for Claude Code.
> It should be kept at the repository root and consulted before each implementation wave.
> It is **not** a one-shot build prompt. The project should be implemented gradually, in controlled waves.

---

## 1. Project summary

**Working name:** `filterbridge`

**Package idea:** a TypeScript npm library for declaring administrative list filters once and reusing that definition across URL search params, React state, backend query DTOs, and future table integrations.

**Core tagline:**

> Declare filters once. Reuse them in URL state, React state, backend DTOs, and admin table workflows.

The project is not a SaaS, not a startup, not a table component, and not a design system. It is a small open-source library focused on developer experience for repetitive admin/dashboard filter logic.

The initial target audience is developers building React/Next.js administrative interfaces with REST APIs, dashboard tables, search filters, status filters, date ranges, number ranges, pagination, and sorting.

The first public version should be small, stable, well-tested, and easy to explain.

---

## 2. Why this project exists

Admin dashboards often repeat the same filter logic in several places:

1. UI state.
2. URL search params.
3. API query DTOs.
4. Table state.
5. Active filter chips.
6. Reset/clear behavior.
7. Defaults and validation.
8. Server/client boundaries.

This creates duplicated code, inconsistent parsing, fragile URLs, and repeated glue code across projects.

The project should solve the first layer of this problem:

> Define filter semantics once and derive the repetitive plumbing from that definition.

The first useful version does not need to solve every table problem. It only needs to prove that a single schema can generate reliable filter state, URL params, and backend DTOs.

---

## 3. Product positioning

### What FilterBridge is

FilterBridge is:

- a TypeScript-first filter schema library;
- a lightweight state/parsing/serialization utility;
- a React helper for filter state;
- a foundation for future adapters such as TanStack Table, Next.js App Router, and shadcn/ui demos;
- a portfolio-quality open-source project focused on DX, correctness, and real corporate app pain.

### What FilterBridge is not

FilterBridge is not:

- a table/grid renderer;
- a replacement for TanStack Table;
- a replacement for nuqs;
- a replacement for React Hook Form;
- a replacement for Zod;
- a shadcn/ui component library;
- a server framework;
- a backend query builder;
- a SaaS;
- a startup idea;
- an AI product;
- a full admin framework.

The project must stay narrow.

---

## 4. Primary goals

The MVP should let a developer do this:

> **Implementation note (Wave 5):** The actual implemented package names are `@filterbridge/core` and `@filterbridge/react`. The boolean builder is `boolean()` (not `booleanFilter()`). Serialization to URL params is `toSearchParams()` (not `serializeFilters()`). The examples below reflect the real API.

```ts
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '@filterbridge/core'

const orderFilters = defineFilters({
  search: text(),
  status: multiSelect(['pending', 'paid', 'failed']),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

const state = parseFilters(orderFilters, {
  search: 'invoice',
  status: 'paid,failed',
  archived: 'false',
  createdAtFrom: '2026-01-01',
  createdAtTo: '2026-01-31',
  amountMin: '100',
  amountMax: '500',
})

const dto = toQueryDto(orderFilters, state)
const params = toSearchParams(orderFilters, state)
```

And in React:

```tsx
import { useFilterBridge } from '@filterbridge/react'

function OrdersPage() {
  const filters = useFilterBridge(orderFilters, {
    initialState: {
      search: 'invoice',
    },
  })

  filters.set('search', 'invoice')
  filters.clear('status')
  filters.reset()

  const dto = filters.toQueryDto()
  const params = filters.toSearchParams()

  return null
}
```

The API should feel boring, predictable, and obvious.

---

## 5. Current strategic decision

The project is a **pnpm workspace** with **five publishable packages**, one per integration
boundary, instead of a single package with subpath exports. It started in Wave 1 with two (`core`
and `react`); `browser`, `tanstack` and `next` were added in Waves 6–8 along the same rule — a
package per external dependency, so nobody installs a peer dependency they do not use.

**Current structure:**

```txt
filterbridge/
  apps/
    demo/                 — Vite + React demo app (@filterbridge/demo, never published)
  packages/
    core/                 — @filterbridge/core        (no dependencies)
      src/
        filter-types.ts
        filter-builders.ts
        define-filters.ts
        infer.ts
        defaults.ts             — filterDefault(), isAtDefault(), getDefaultFilterState()
        filter-validation.ts    — option membership, default validity, param-key uniqueness
        param-keys.ts           — the ONLY place a filter name becomes a URL param key
        parse-filters.ts
        search-params.ts
        query-dto.ts
        index.ts
    react/                — @filterbridge/react       (peer: react)
      src/
        types.ts
        clean-state.ts
        active-filters.ts
        use-filter-bridge.ts
        index.ts
    browser/              — @filterbridge/browser     (peer: react, optional — /react subpath only)
    tanstack/             — @filterbridge/tanstack    (peer: @tanstack/react-table)
    next/                 — @filterbridge/next        (no peer; never imports next/*)
  docs/                   — api/, guides/, concepts/, decisions/, releases/, sprints/
  examples/
    basic/                — copy-paste snippets
    next-app-router/      — runnable Next.js 15 app. OUTSIDE the pnpm workspace
                            (excluded in pnpm-workspace.yaml), installed with npm,
                            pinned to published FilterBridge versions. Do not add it
                            to the workspace — that would put Next.js and React DOM
                            into every contributor's install and every CI leg.
  scripts/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  vitest.workspace.ts     — the project list; vitest.config.ts is empty by design (ADR-003)
  vitest.aliases.ts       — resolves @filterbridge/* to source in tests
  README.md
  CLAUDE.md
```

Reasoning:

- Separate packages keep the dependency graph explicit — `core` has no React, `next` has no
  `next/*` import, and `browser`'s React dependency is confined to its `/react` entry point.
- Every adapter depends on core via `workspace:*`. One adapter depends on another: `next` depends on
  `browser`, because `createNextFilterHref` delegates to `createFilterUrl` rather than reimplementing
  URL assembly. That is the only such edge, and it is the right direction — `browser` knows nothing
  about `next`.
- All five ship ESM and CJS with TypeScript declarations.

See [ADR-001](docs/decisions/001-project-architecture.md) for the full reasoning. A future single
`filterbridge` package (with subpath exports for `/react`, `/next`, etc.) could be created after the
API is stable, but is not planned.

---

## 6. Current package exports

**Implemented exports (current, `0.4.0`):**

```ts
import {
  boolean,
  dateRange,
  dateRangeParamKeys,
  defineFilters,
  filterParamKeys,
  getDefaultFilterState,
  getFilterParamKeys,
  isAtDefault,
  multiSelect,
  numberRange,
  numberRangeParamKeys,
  parseFilters,
  scalarParamKey,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '@filterbridge/core'

import type {
  AnyFilter,
  BooleanFilter,
  DateRangeConfig,
  DateRangeFilter,
  DateRangeKeys,
  DateRangeValue,
  FilterConfig,
  FilterSchema,
  FilterStateValue,
  InferFilterState,
  MultiSelectFilter,
  NumberRangeConfig,
  NumberRangeFilter,
  NumberRangeKeys,
  NumberRangeValue,
  ParamKeyConfig,
  SelectFilter,
  TextConfig,
  TextFilter,
} from '@filterbridge/core'
```

> Only `select`, `multiSelect` and `boolean` accept `{ default }` — see
> [ADR-002](docs/decisions/002-default-values.md). Since `0.4.0` every builder accepts a URL param
> key override: `key: string` on the four filters that occupy one param, `keys` on the two ranges
> that occupy two. `text` takes `TextConfig`, which is the key without the default.
>
> **`param-keys.ts` is the only place a filter name becomes a URL param key.** `parseFilters`,
> `toSearchParams`, `@filterbridge/browser` and `@filterbridge/next` all read from it. Do not
> reintroduce a `` `${name}From` `` anywhere else — four independent copies of that rule are what
> this collapsed, and the duplication had already caused one data-loss bug.
>
> **Schema mistakes throw at definition time, not at runtime.** `defineFilters` rejects two filters
> resolving to the same param key, and a range whose two sides resolve to one key. The builders
> reject a `keys` side that does not exist (`{ form: ... }`), an empty key, and a key with leading or
> trailing whitespace — padding is rejected rather than trimmed, so the param name in the source is
> the param name on the wire. `filterParamKeys` enumerates all six kinds and throws on an unknown
> one instead of guessing `[name]`.
>
> These all follow the ADR-002 rule: a schema is static configuration evaluated at module load, so a
> mistake fails identically on every run. Serializers still degrade and warn — they run in render
> paths.

```ts
import { useFilterBridge } from '@filterbridge/react'

import type { UseFilterBridgeOptions, UseFilterBridgeReturn } from '@filterbridge/react'
```

> The hook returns `state`, `set`, `setMany`, `clear`, `reset`, `resetToInitial`, `syncState`,
> `hasActiveFilters`, `activeFilterCount`, `toQueryDto`, `toSearchParams`.

```ts
import {
  createFilterUrl,
  getFilterParamKeys,
  parseFiltersFromUrl,
  pushUrlFilters,
  replaceUrlFilters,
} from '@filterbridge/browser'

import type { CreateFilterUrlOptions, SyncUrlOptions, UrlLike } from '@filterbridge/browser'

// Separate entry point. React is an *optional* peer dependency of
// @filterbridge/browser — only this subpath imports it, so the root entry stays
// usable without React.
import { usePopstateSync } from '@filterbridge/browser/react'

import type { UsePopstateSyncOptions } from '@filterbridge/browser/react'
```

> **Note:** The original plan used `booleanFilter()` and `serializeFilters()`. The actual implementation uses `boolean()` and `toSearchParams()`. Do not use the old names in new code or documentation.

```ts
import {
  toTanStackColumnFilters,
  fromTanStackColumnFilters,
  filterBridgeFilterFns,
} from '@filterbridge/tanstack'

import type {
  TanStackColumnFilter,
  TanStackColumnFiltersState,
  ToTanStackColumnFiltersOptions,
  FromTanStackColumnFiltersOptions,
  FilterFnLike,
} from '@filterbridge/tanstack'
```

```ts
import {
  normalizeNextSearchParams,
  parseNextSearchParams,
  parseNextSearchParamsAsync,
  createNextFilterHref,
} from '@filterbridge/next'

import type {
  NextSearchParamsInput,
  NextSearchParamsRecord,
  ReadonlyURLSearchParamsLike,
  MaybePromise,
  CreateNextFilterHrefOptions,
} from '@filterbridge/next'
```

Do not implement future exports until a wave explicitly asks for them.

---

## 7. MVP filter types

The initial library should support exactly these filter types:

### `text()`

Represents a text search field.

Expected state:

```ts
string | undefined
```

Parsing rules:

- Empty string should become `undefined`. `text()` accepts `{ key }` but no default — see §8.
- Non-string values should be ignored.
- No fuzzy search logic.
- No debouncing in core.

Serialization rules:

- `undefined` should be omitted.
- Non-empty string should be serialized as the configured key.

---

### `select(options)`

Represents one selected value from a fixed list.

Expected state:

```ts
Option | undefined
```

Parsing rules:

- Accept only values included in the options list.
- Invalid values become `undefined`.
- Options should infer literal union types when possible.

Example:

```ts
const status = select(['pending', 'paid', 'failed'])
// inferred value: "pending" | "paid" | "failed" | undefined
```

---

### `multiSelect(options)`

Represents multiple values from a fixed list.

Expected state:

```ts
Option[]
```

Parsing rules:

- Accept comma-separated strings in MVP.
- Repeated query params can be supported later, but not required in the first wave.
- Invalid values should be discarded.
- Missing values should become `[]`.
- Preserve option order from the URL unless a later wave defines stable sorting.

Example:

```ts
;((status = paid), failed)
```

---

### `boolean()`

> **Implementation note:** The original plan named this `booleanFilter()`. The actual implementation uses `boolean()`. Use `boolean()` in all code and documentation.

Represents a boolean value.

Expected state:

```ts
boolean | undefined
```

Parsing rules:

- `"true"` and `"1"` become `true`.
- `"false"` and `"0"` become `false`.
- Missing or invalid values become `undefined`.

Serialization rules:

- `true` serializes as `"true"`.
- `false` serializes as `"false"`.
- `undefined` is omitted.

---

### `dateRange()`

Represents a range of ISO-like date strings.

Expected state:

```ts
{
  from?: string
  to?: string
}
```

Default URL keys:

For a filter called `createdAt`:

```txt
createdAtFrom
createdAtTo
```

Parsing rules:

- Do not introduce a date library in MVP.
- Accept strings that look like dates.
- Invalid/missing values are omitted from the range object.
- Empty range is `{}`.

Serialization rules:

- Omit empty sides.
- Serialize `from` to `<filterName>From`.
- Serialize `to` to `<filterName>To`.

Since `0.3.1`, both keys can be overridden — `dateRange({ keys: { from: 'created_after' } })`. Either
side alone is allowed; the other stays derived. Derivation lives in `packages/core/src/param-keys.ts`
and nowhere else — which became true for all six filter kinds in `0.4.0`, not just the two ranges.

---

### `numberRange()`

Represents a numeric range.

Expected state:

```ts
{
  min?: number
  max?: number
}
```

Default URL keys:

For a filter called `amount`:

```txt
amountMin
amountMax
```

Parsing rules:

- Parse numeric strings.
- Invalid numbers are omitted.
- Empty range is `{}`.

Serialization rules:

- Omit empty sides.
- Serialize `min` to `<filterName>Min`.
- Serialize `max` to `<filterName>Max`.

Overridable since `0.3.0` in the same way: `numberRange({ keys: { min: 'min_cents' } })`.

---

## 8. Core API shape

The public API should be small and stable.

### `defineFilters(definition)`

Creates a typed filter schema.

Example:

```ts
const userFilters = defineFilters({
  search: text(),
  role: select(['admin', 'viewer']),
  active: boolean(),
})
```

Since `0.3.0` it also **throws** when two filters resolve to the same URL param key — including the
pre-existing case with no custom key, such as `{ createdAtFrom: text(), createdAt: dateRange() }`,
where `toSearchParams` used to let the last writer win silently.

### `parseFilters(schema, input)`

Parses unknown URL/search-param-like input into typed filter state.

Accepts:

```ts
Record<string, unknown>
URLSearchParams
```

Output is typed as `InferFilterState<typeof schema>`.

### `toSearchParams(schema, state)`

> **Note:** Originally planned as `serializeFilters()`. Implemented as `toSearchParams()`.

Serializes typed state into URL-friendly search params. Returns `URLSearchParams`.

### `toQueryDto(schema, state)`

Converts typed filter state into a backend-friendly DTO.

Initial behavior:

- remove undefined values;
- keep arrays;
- keep range objects if not empty;
- omit empty arrays;
- omit empty range objects.

Example output:

```ts
{
  search: "invoice",
  status: ["paid", "failed"],
  createdAt: {
    from: "2026-01-01",
    to: "2026-01-31"
  },
  amount: {
    min: 100,
    max: 500
  }
}
```

### `getDefaultFilterState(schema)`

**Implemented in Sprint 0, task 7.**

Returns the state a schema starts from: every filter that declares a `default`, at that default.
Filters without one are absent. It returns the same object `parseFilters(schema, {})` produces.

`select`, `multiSelect` and `boolean` take an optional `{ default }` as their last argument
(`select(options, { default: 'paid' })`). `text`, `dateRange` and `numberRange` do not: a default is
only accepted where the value space is a fixed, enumerable set. See
[ADR-002](docs/decisions/002-default-values.md).

**Default semantics (settled in Sprint 0, task 7):**

- `parseFilters` applies the default when the key is absent **or** present but invalid.
- `toSearchParams` and `toQueryDto` **omit** a value equal to its default, so a page at its default
  state has no query string. The round trip still holds — the default is restored on the way in.
- `select` / `multiSelect` defaults are validated against `options` and **throw** at schema
  definition if invalid. This is the one place core throws; serializers still degrade and warn.
- Cost, documented in `docs/api/core.md`: a URL no longer fully describes the state, so changing a
  default in code changes what old bookmarks mean, and "no value" is unreachable through the URL for
  a filter that has a default.
- `InferFilterState` keeps every field optional. Typing a defaulted filter as required is a
  breaking type change deferred to `v1.0`.

---

## 9. React API shape

The React package should be a thin adapter over core functions.

### `useFilterBridge(schema, options)`

Expected rough API:

```ts
const filters = useFilterBridge(orderFilters, {
  initialState,
  onChange(nextState) {
    // optional
  },
})
```

Returned object:

```ts
{
  state,
  set,
  setMany,
  clear,
  reset,
  resetToInitial,
  syncState,
  hasActiveFilters,
  activeFilterCount,
  toQueryDto,
  toSearchParams,
}
```

Suggested methods:

```ts
filters.set('search', 'invoice')
filters.set('status', ['paid', 'failed'])
filters.clear('search')
filters.reset()
filters.resetToInitial()
filters.toQueryDto()
filters.toSearchParams()
```

**Reset semantics (settled in Sprint 0, task 6):**

- `reset()` means **clear everything** — state becomes `{}`. It does _not_ restore `initialState`.
- `resetToInitial()` restores the `initialState` passed at mount. The value is captured once on the
  first render and cleaned like any other state write, so later changes to the `initialState` prop
  are ignored and the hook stays uncontrolled.
- Both go through the normal update path: empty values are cleaned and `onChange` fires.
- `syncState()` is the exception — it replaces the state without firing `onChange`.

Rules:

- React package must depend on core.
- Core must not depend on React.
- Keep the hook small.
- Avoid URL synchronization in the first React hook unless explicitly requested.
- Do not add Next.js-specific behavior to the generic React hook.

---

## 10. TypeScript requirements

Type inference is a major selling point.

The library should infer state from schema definitions.

Example expectation:

```ts
const filters = defineFilters({
  search: text(),
  status: multiSelect(['pending', 'paid', 'failed'] as const),
  archived: boolean(),
  amount: numberRange(),
})

type State = InferFilterState<typeof filters>
```

Expected type:

```ts
type State = {
  search?: string
  status?: Array<'pending' | 'paid' | 'failed'>
  archived?: boolean
  amount?: {
    min?: number
    max?: number
  }
}
```

> **Implementation note (Wave 5):** All fields in `InferFilterState` are optional (`?`). The `multiSelect` state is `Array<T> | undefined`, not `Array<T>`. This matches the actual implementation in `infer.ts`.

The exact optionality can evolve, but it should be coherent and tested.

Preferred style:

- strict TypeScript;
- no `any` in public types unless impossible;
- use `unknown` internally when parsing untrusted input;
- favor simple generic types over clever unreadable ones;
- public types should be exported.

---

## 11. Implementation principles

### Core principles

- Keep core functions pure.
- Make serialization deterministic.
- Omit empty values from URL/query DTO output.
- Treat URL params as untrusted input.
- Prefer small composable functions.
- Prefer boring code over overly clever type gymnastics.
- Keep runtime behavior easy to test.
- Do not introduce a schema validation dependency in MVP unless absolutely necessary.

### Dependency principles

Avoid unnecessary dependencies.

Allowed in MVP:

- TypeScript
- React as peer dependency for React subpath
- Vitest
- tsup or equivalent build tool
- testing-library for React hook tests if needed

Avoid in MVP unless explicitly approved:

- Zod
- Valibot
- nuqs
- TanStack Table
- shadcn/ui
- date-fns
- lodash
- complex URL libraries
- state management libraries

The first version should prove the library's own value before attaching to many ecosystem dependencies.

---

## 12. Out of scope for MVP

Do not implement these in the initial waves unless explicitly requested:

- visual table renderer;
- shadcn/ui components;
- Tailwind styles;
- TanStack Table adapter;
- Next.js App Router adapter;
- pagination;
- sorting;
- saved presets;
- localStorage persistence;
- server persistence;
- faceted filters;
- async options;
- debounced text input;
- fuzzy search;
- backend query language;
- SQL generation;
- Prisma/Drizzle integration;
- OpenAPI generation;
- form library integration;
- drag-and-drop;
- column visibility;
- row selection;
- advanced date validation;
- timezone logic.

These can become later roadmap items.

---

## 13. Quality bar

This project should be portfolio-quality.

That means:

- clean public API;
- strong README;
- good examples;
- tests for core behavior;
- predictable package exports;
- no half-broken demo;
- no placeholder documentation;
- no over-engineered abstractions;
- no huge dependency tree;
- no implementation that only works in one local machine.

The project should feel like a real npm package, not a weekend code dump.

---

## 14. Documentation language

Public-facing docs should preferably be written in English because the package is intended for npm/GitHub.

Internal planning and prompts can be in Portuguese.

Recommended README tone:

- direct;
- practical;
- code-first;
- honest about scope;
- no hype;
- no startup language.

Avoid phrases like:

- “revolutionary”
- “AI-powered”
- “enterprise-grade” unless justified
- “the ultimate table solution”
- “all-in-one admin framework”

Good positioning:

> FilterBridge is a small TypeScript utility for keeping admin list filters consistent across state, URLs, and backend query DTOs.

---

## 15. Suggested README structure

The README should eventually contain:

1. Project title and tagline.
2. Short problem statement.
3. Installation.
4. Quick example.
5. React example.
6. Supported filter types.
7. Why not just use URLSearchParams manually?
8. Why not just use nuqs?
9. Why not just use TanStack Table state?
10. API reference.
11. Non-goals.
12. Roadmap.
13. Contributing.
14. License.

The README should show the value in the first 30 seconds.

---

## 16. Repository scripts

The root scripts as they exist today:

| Script                                               | What it does                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                                         | Builds the five publishable packages (explicit `--filter` list, so the demo is excluded)                                                                                                                                                                                                 |
| `pnpm test`                                          | `vitest run` from the root — projects come from `vitest.workspace.ts`, sources from `vitest.aliases.ts`                                                                                                                                                                                  |
| `pnpm typecheck`                                     | `pnpm -r typecheck`. **Requires `pnpm build` first** — `tsc` resolves siblings through their emitted `.d.ts`, and `dist/` is gitignored                                                                                                                                                  |
| `pnpm lint` / `pnpm format`                          | ESLint and Prettier across the repository                                                                                                                                                                                                                                                |
| `pnpm demo` / `pnpm demo:build`                      | Runs or builds `apps/demo`                                                                                                                                                                                                                                                               |
| `pnpm demo:a11y`                                     | Runs axe-core against the running demo in real Chromium, with `color-contrast` enabled — the rule the jsdom suite cannot evaluate. Needs `pnpm demo` running. Not in CI                                                                                                                  |
| `pnpm pack:all` / `pnpm clean:packs`                 | Packs all five packages to `.packs/` for smoke testing, and clears it                                                                                                                                                                                                                    |
| `pnpm screenshot`                                    | Captures the demo screenshot via Playwright (needs `pnpm demo` running)                                                                                                                                                                                                                  |
| `pnpm demo:a11y:install` / `pnpm screenshot:install` | Downloads Playwright's Chromium. `pnpm install` gets the `playwright` package but not the browser binary, so the first run of either script above fails with `Executable doesn't exist` until one of these is run. Same command; both names exist so each script has a discoverable pair |

`pnpm test` deliberately does **not** delegate to per-package `pnpm -r test`: the root vitest run is
what resolves `@filterbridge/*` to source instead of to a stale `dist/`. See
[ADR-003](docs/decisions/003-test-resolution.md).

---

## 17. Suggested test strategy

### Core tests

Core behavior should be heavily tested.

Minimum tests:

- parse text filter;
- parse empty text filter;
- parse select valid value;
- parse select invalid value;
- parse multiSelect comma-separated values;
- discard invalid multiSelect values;
- parse boolean true/false;
- parse boolean 1/0;
- discard invalid boolean;
- parse dateRange with from/to;
- parse dateRange with only from;
- parse dateRange with only to;
- parse numberRange with min/max;
- discard invalid numberRange values;
- serialize text;
- serialize select;
- serialize multiSelect;
- serialize boolean;
- serialize dateRange;
- serialize numberRange;
- roundtrip parse -> serialize -> parse;
- toQueryDto removes undefined values;
- toQueryDto removes empty arrays;
- toQueryDto removes empty range objects.

### React tests

Minimum tests:

- initializes with default/initial state;
- `set` updates one filter;
- `clear` removes one filter;
- `reset` returns to initial/default state;
- `toQueryDto` reflects current state;
- `toSearchParams` reflects current state.

### Demo tests

Can be added later:

- smoke test that demo page loads;
- filters update visible state;
- reset clears filters.

---

## 18. Wave roadmap

The user intends to drive this project in waves. Claude Code should only execute the current requested wave.

### ✅ Wave 1 — Repository foundation (COMPLETED)

- Created pnpm workspace with `@filterbridge/core` and `@filterbridge/react` packages.
- Configured TypeScript, tsup build, Vitest, ESLint, Prettier.
- Created initial README and package scaffolding.

---

### ✅ Wave 2 — Core DSL, parsing, serialization, query DTO (COMPLETED)

- Implemented `defineFilters`, `text`, `select`, `multiSelect`, `boolean`, `dateRange`, `numberRange`.
- Implemented `parseFilters` (accepts `Record<string, unknown>` and `URLSearchParams`).
- Implemented `toSearchParams` (deterministic `URLSearchParams` serialization).
- Implemented `toQueryDto` (strips empty values for backend).
- Exported `InferFilterState`, `FilterStateValue`, and all filter type interfaces.
- Added full test suite covering parsing, serialization, roundtrip, and DTO.

---

### ✅ Wave 3 — React hook (COMPLETED)

- Implemented `useFilterBridge` with `state`, `set`, `setMany`, `clear`, `reset`.
- Implemented `hasActiveFilters`, `activeFilterCount`.
- Implemented `toQueryDto()` and `toSearchParams()` on the hook return.
- Added clean-state behavior (empty values automatically removed).
- Added React hook tests via `@testing-library/react`.
- Exported `UseFilterBridgeOptions` and `UseFilterBridgeReturn` types.

---

### ✅ Wave 4 — Demo app (COMPLETED)

- Created `apps/demo` with Vite + React.
- Invoice admin screen with all six filter types.
- Live output panel showing React state, backend DTO, and URLSearchParams.
- "Fill example" and "Reset filters" buttons.

---

### ✅ Wave 5 — Documentation pass (COMPLETED)

- Rewrote root `README.md` with status, examples, comparisons, non-goals, roadmap.
- Updated `packages/core/README.md` to reflect current state.
- Updated `packages/react/README.md` — fixed incorrect Wave 3 roadmap entry.
- Updated `apps/demo/README.md`.
- Created `docs/api/core.md` — full core API reference.
- Created `docs/api/react.md` — full React API reference.
- Created `docs/concepts/why-filterbridge.md`.
- Created `docs/concepts/architecture.md`.
- Created `docs/concepts/non-goals.md`.
- Corrected CLAUDE.md API naming inconsistencies (`booleanFilter` → `boolean`, `serializeFilters` → `toSearchParams`).

---

### ✅ Wave 6 — Browser URL synchronization helpers (COMPLETED)

- Created `@filterbridge/browser` package.
- Implemented `getFilterParamKeys(schema)` — returns URL param keys for a schema.
- Implemented `parseFiltersFromUrl(schema, input?)` — parses filter state from URL, string, URLSearchParams, URL object, or location-like object. Falls back to `window.location.search` when called with no input. SSR-safe.
- Implemented `createFilterUrl(schema, state, options?)` — builds a URL path string, preserving non-filter params from `currentSearch` by default, removing stale filter params.
- Implemented `replaceUrlFilters(schema, state, options?)` — calls `window.history.replaceState`.
- Implemented `pushUrlFilters(schema, state, options?)` — calls `window.history.pushState`.
- Added full test suite: `getFilterParamKeys`, `parseFiltersFromUrl`, `createFilterUrl`, `replaceUrlFilters`, `pushUrlFilters`.
- Updated `apps/demo` to initialize from URL and sync on change (`replaceUrlFilters`).
- Created `packages/browser/README.md`.
- Created `docs/api/browser.md` and `docs/guides/url-sync.md`.
- Updated `docs/concepts/architecture.md` to include the browser package.
- Updated root `package.json` build script and `vitest.config.ts` to include the browser package.

Known limitations _as of Wave 6_ — the first two were closed later:

- ~~No `popstate` handler~~ — closed in Sprint 0: `usePopstateSync` in `@filterbridge/browser/react`,
  paired with `useFilterBridge().syncState`. See [ADR-004](docs/decisions/004-external-state-sync.md).
- ~~No Next.js App Router integration~~ — closed in Wave 8 (`@filterbridge/next`).
- No React Router integration. Still open, and not planned.

---

### ✅ Wave 7 — TanStack Table adapter (COMPLETED)

- Created `@filterbridge/tanstack` package.
- Implemented `toTanStackColumnFilters(schema, state, options?)` — converts FilterBridge state to TanStack `columnFilters`, supports `columnIds` remapping, omits empty values.
- Implemented `fromTanStackColumnFilters(schema, columnFilters, options?)` — converts TanStack `columnFilters` back to FilterBridge state, validates against schema, accepts multiSelect as array or CSV, accepts numberRange as object or `[min, max]` tuple.
- Implemented `filterBridgeFilterFns` — client-side filter functions for `text`, `select`, `multiSelect`, `boolean`, `dateRange`, `numberRange`, compatible with TanStack Table's `filterFns` option.
- Added full test suite (toTanStackColumnFilters, fromTanStackColumnFilters, filterBridgeFilterFns).
- Updated `apps/demo` to show `TanStack columnFilters` output and a live-filtered invoice table using TanStack Table.
- Created `apps/demo/src/data/invoices.ts` with 10 fake invoices.
- Created `packages/tanstack/README.md`, `docs/api/tanstack.md`, `docs/guides/tanstack-table.md`.
- Updated `docs/concepts/architecture.md` to include the tanstack package.
- Updated root `package.json` build script and `vitest.config.ts` to include the tanstack package.

Known limitations _as of Wave 7_:

- `filterBridgeFilterFns.dateRange` uses lexicographic ISO string comparison — no timezone or non-ISO support. Still open.
- ~~No `popstate` handler~~ — closed in Sprint 0, see Wave 6 above.
- No pagination or sorting adapters. Still open.
- TanStack Table is a peer dependency; it is not bundled into the package. By design.

---

### ✅ Wave 8 — Next.js App Router adapter (COMPLETED)

- Created `@filterbridge/next` package.
- Implemented `normalizeNextSearchParams(schema, searchParams?)` — schema-aware conversion of Next.js searchParams (plain record, URLSearchParams, ReadonlyURLSearchParams-like) to `Record<string, unknown>` for `parseFilters()`.
- Implemented `parseNextSearchParams(schema, searchParams?)` — parses Next.js searchParams into typed `InferFilterState<S>`. Does not access `window`. Server-safe.
- Implemented `parseNextSearchParamsAsync(schema, searchParams?)` — accepts `MaybePromise<NextSearchParamsInput>` for Next.js 15+ where searchParams may be a Promise.
- Implemented `createNextFilterHref(schema, state, options?)` — builds href string for `<Link>`, `router.push()`, or `router.replace()`. Preserves non-filter params by default, removes stale filter params, supports hash. Does not access `window`.
- Added full test suite (normalizeNextSearchParams, parseNextSearchParams, parseNextSearchParamsAsync, createNextFilterHref).
- Created `packages/next/README.md`, `docs/api/next.md`, `docs/guides/next-app-router.md`.
- Updated `docs/concepts/architecture.md` to include the next package.
- Updated root `package.json` build script and `vitest.config.ts` to include the next package.
- Updated CLAUDE.md exports section with `@filterbridge/next` API.

Known limitations:

- No automatic URL sync — users call `router.replace(href)` in `onChange` explicitly.
- No `popstate` listener — back/forward triggers a full server component re-render which re-initializes state correctly.
- No pagination or sorting adapters.
- Repeated non-filter params (e.g., `tab=a&tab=b`) passed via `searchParams` option are deduplicated.
- Does not import from `next/navigation`, `next/server`, or `next/link`.

---

### ✅ Wave 9 — Package hardening (COMPLETED)

- Set version `0.1.0` on all 5 publishable packages.
- Added `author`, `repository`, `bugs`, `homepage`, `sideEffects: false`, expanded `keywords` to all packages.
- Updated `description` in all packages to final copy.
- Updated `files` to `["dist", "README.md"]` in all packages.
- Created root `LICENSE` (MIT, 2026, Gabriel Paes Schulz).
- Confirmed ESM/CJS dual output: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts` in all packages.
- Confirmed `workspace:*` references are resolved to `0.1.0` in packed tarballs.
- Installed `@changesets/cli` as dev dependency.
- Initialized `.changeset/config.json` with `access: public` and all 5 packages in `fixed` array.
- Created `.changeset/initial-release.md` changeset for `0.1.0`.
- Updated `.gitignore` to ignore `.packs/`, `.smoke/`, `*.tgz`.
- Added `pack:all` script (runs `scripts/pack-all.mjs`) and `clean:packs` script.
- Created `scripts/pack-all.mjs` — packs all 5 packages to `.packs/`.
- Ran `pnpm pack:all` — all 5 tarballs generated and inspected.
- Created `.smoke/` project — installs tarballs via npm file refs.
- Created `.smoke/src/esm.mjs` — 39 ESM assertions (all passing).
- Created `.smoke/src/cjs.cjs` — 29 CJS assertions (all passing).
- Created `docs/release-checklist.md`.

Known notes:

- Smoke test must be installed via `npm install` (not pnpm) because pnpm resolves workspace root.
- Repository URL `https://github.com/gabpaesschulz/filterbridge.git` was a placeholder at the time —
  it is now the real repository, and all five packages are published under it.

Result: all five packages published.

---

### ✅ Wave 10 — First release candidate (COMPLETED)

- Final bug pass, README finalized, full suite green.
- npm publishing checklist written ([`docs/release-checklist.md`](docs/release-checklist.md)).
- `0.1.0` published to npm and tagged; release notes in
  [`docs/releases/v0.1.0.md`](docs/releases/v0.1.0.md).

**Waves are finished.** They described building the library from nothing to a first publish, and
that is done. Work after `0.1.0` is organised as **sprints** instead — see below.

---

## 18b. Sprints (post-`0.1.0`)

A wave built something that did not exist. A sprint changes something that is already published, so
it has a different shape: it starts from defects and gaps found by exercising the shipped API, each
task carries a decision to take before code, and every change needs a changeset because someone is
already depending on the old behavior.

Sprint documents live in `docs/sprints/<name>/`. They are **process records, not specifications**:
each task file states what one session believed while doing the work. Where a later decision
contradicts them, the durable record is an ADR in
[`docs/decisions/`](docs/decisions/), not the sprint file.

### ✅ Sprint 0 — Post-release hardening (COMPLETED, shipping as `0.2.0`)

Ten planned tasks plus four found by the code review that closed the sprint.

- **Core correctness:** repeated query params, non-finite numbers, schema validation on
  serialization, empty-value normalization, `boolean` type-check parity in `toQueryDto`.
- **API:** per-filter defaults (`select` / `multiSelect` / `boolean` only), `getDefaultFilterState`,
  `isAtDefault`, `syncState`, `resetToInitial`, `usePopstateSync` behind
  `@filterbridge/browser/react`.
- **Semantics:** the DTO carries defaults while the URL omits them, and hook state is always a state
  some URL parses to. Both recorded in [ADR-002](docs/decisions/002-default-values.md).
- **Demo:** tri-state boolean control, label association verified by axe-core, back/forward support.
- **Infrastructure:** CI on Linux and Windows across Node 18/20/22; the test suite resolves
  `@filterbridge/*` to source while `.smoke/` covers the published tarballs.

Suite: 299 → 538 tests, 17 → 28 files.

---

### ✅ Sprint 1 — Ergonomics and debt (COMPLETED, shipping as `0.3.0`)

Recorded in [`docs/sprints/sprint-1/`](docs/sprints/sprint-1/README.md). Five planned tasks, plus one
found by executing task 4.

- **API:** `keys` overrides on `dateRange` / `numberRange`, and key derivation collapsed from four
  independent copies into `packages/core/src/param-keys.ts`. `defineFilters` throws on a duplicate
  param key — a behavior change, spelled out in the changeset.
- **Infrastructure:** `pnpm format:check` is a CI job; `.gitattributes` pins text files to LF so the
  check means the same thing on Windows.
- **Demo:** palette re-measured to WCAG AA, plus `pnpm demo:a11y` — a real-Chromium axe run that can
  check contrast where the jsdom suite structurally cannot.
- **Examples:** `examples/next-app-router`, a running Next.js 15 app outside the pnpm workspace.
- **Found by running it:** the Next.js guide was wrong about back/forward in two ways, both fixed;
  and `useFilterBridge` fires `onChange` during the render phase, which is
  [task 6](docs/sprints/sprint-1/06-onchange-fires-during-render.md) — **still open, deferred to
  Sprint 2**, with a `queueMicrotask` workaround documented in the guide and the example.

Suite: 538 → 573 tests, 28 → 29 files. The 538 existing tests passed unmodified, which was the guard
on the key-derivation refactor.

---

### ✅ Sprint 2 — The hook's contract with React (COMPLETED, shipping as `0.4.0`)

Recorded in [`docs/sprints/sprint-2/`](docs/sprints/sprint-2/README.md). Six tasks, all done.

- **`react`:** `onChange` no longer fires during the render phase. It used to be called from inside
  the `setState` updater; the next state is now computed in the event handler and the callback fires
  there. Navigating from `onChange` (`router.push`) is safe, and it fires once rather than twice
  under `<React.StrictMode>`. See [ADR-006](docs/decisions/006-onchange-timing.md).
- **`core` / `next`:** `key` on `text`, `select`, `multiSelect` and `boolean` — `text({ key: 'q' })`
  writes `?q=`. Preceded by a behavior-preserving refactor that finally made `param-keys.ts` the one
  place a name becomes a param key for all six filter kinds, not two.
- **Infrastructure:** `packages/react` and `packages/browser` run their suites against React 18
  **and** React 19, so `react: >=18` is checked rather than declared. React 19 lives in
  `tools/react-19` — a private workspace package with no source, because an aliased devDependency
  installs React DOM 19 against React 18. Strict Mode is in the suite for the first time.
- **Examples:** `pnpm verify:next-example` drives `examples/next-app-router` in real Chromium.
  It must run under `next dev`: React strips the render-phase warning from production builds, so a
  `next start` run passes every check against a library that has the defect.
- **Repository:** this file is tracked now. §21 moved to `docs/marketing/`, which stays ignored.

Suite: 581 → 849 tests, 29 → 45 files. `.smoke/`: 66/50 → 84/60.

### 🔵 Sprint 3 — not yet planned

Nothing filed. [The roadmap](docs/roadmap.md) has the open candidates; the largest is narrowing
`InferFilterState` optionality for defaulted filters, which is a `v1.0` item by
[ADR-002 §5](docs/decisions/002-default-values.md).

---

## 19. Future roadmap ideas

Only after MVP is stable:

### TanStack Table adapter

Potential API:

```ts
import { toTanStackColumnFilters } from 'filterbridge/tanstack'
```

Could generate:

- `columnFilters`;
- maybe sorting;
- maybe pagination later.

### Next.js adapter

Potential API:

```ts
import { parseNextSearchParams } from 'filterbridge/next'
```

Could support:

- App Router `searchParams`;
- server component parsing;
- client-side router update helpers later.

### UI helpers

Potential API:

```tsx
import { ActiveFilterChips } from 'filterbridge/react'
```

Could support:

- active chips;
- clear one;
- reset all.

Avoid shipping complex visual components too early.

### shadcn/ui demo

Use shadcn only as a demo integration, not as a required dependency.

### Query key integration

Potential future helper:

```ts
const queryKey = createFilterQueryKey('orders', state)
```

Useful for TanStack Query.

---

## 20. Naming notes

Current working name:

```txt
filterbridge
```

Other possible names if npm name is unavailable:

```txt
queryshape
filterframe
querybridge
filterkit
listfilters
filterstate
filtercraft
```

Before final publishing:

- check npm availability;
- check GitHub repository name availability;
- avoid names already used by active libraries;
- prefer memorable but clear names.

---

## 21. Portfolio angle

Moved to `docs/marketing/portfolio-angle.md`, which is gitignored. It is the one part of this file
that is self-presentation rather than project documentation, and this file became tracked in Sprint
2 — see [task 5](docs/sprints/sprint-2/05-repository-housekeeping.md).

---

## 22. Claude Code behavior rules

When working on this project, Claude Code should follow these rules:

1. Do not implement beyond the current requested wave or sprint task.
2. Do not add dependencies without a clear reason.
3. Do not change the public API casually.
4. Do not introduce framework-specific behavior into the core.
5. Do not use React inside core.
6. Do not build visual components unless a wave explicitly asks for them.
7. Do not create a table renderer.
8. Do not add Next.js, TanStack Table, shadcn/ui, or nuqs unless the current wave asks for it.
9. Do not optimize prematurely.
10. Do not hide failing tests.
11. Do not leave placeholder docs once docs are requested.
12. Keep commits/changes logically grouped.
13. Explain tradeoffs when making architectural choices.
14. Prefer simple working code over abstract framework code.
15. Preserve strict TypeScript compatibility.

---

## 23. Acceptance checklist for a release

Met for `0.1.0` and again for `0.2.0`. Re-check every item before the next publish — the live,
step-by-step version is [`docs/release-checklist.md`](docs/release-checklist.md).

- `pnpm install` works from a clean clone;
- `pnpm build` passes;
- `pnpm test` passes on a clean clone with no build (vitest resolves to source);
- `pnpm typecheck` passes **after** a build;
- package exports work — `@filterbridge/core`, `/react`, `/browser`, `/browser/react`, `/tanstack`,
  `/next`, in both ESM and CJS, verified by `.smoke/` against the packed tarballs;
- core API and React hook are documented;
- README has real examples;
- packages can be packed with `pnpm pack:all`;
- no feature depends on unpublished local hacks;
- no placeholder text remains in public docs;
- project has a clear license;
- GitHub description and topics are set;
- release notes drafted in `docs/releases/`.

---

## 24. Final reminder

The project wins by being small, useful, typed, tested, and well explained.

Do not chase every possible integration early.

The first milestone is not “build the ultimate admin filtering framework.”

The first milestone is:

> Publish a small npm package that makes filter state, URL params, and backend DTOs consistent from one schema.
