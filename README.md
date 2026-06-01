# FilterBridge

Schema-first filters for React admin screens.

Declare filters once as a typed schema. Reuse that definition as React state, URL search params, and backend query DTOs — without rewriting the same glue code in every project.

---

## Status

**Experimental — not yet published to npm.**

The packages are prepared for npm publication but have not been published yet.

Implemented:
- `@filterbridge/core` — schema-first filter definitions, parsing, URL serialization, backend DTO generation
- `@filterbridge/react` — `useFilterBridge` React state hook
- `@filterbridge/browser` — browser URL sync helpers (`createFilterUrl`, `pushUrlFilters`, `replaceUrlFilters`)
- `@filterbridge/tanstack` — TanStack Table adapter (`toTanStackColumnFilters`, `fromTanStackColumnFilters`, `filterBridgeFilterFns`)
- `@filterbridge/next` — Next.js App Router adapter (`parseNextSearchParams`, `createNextFilterHref`)

Not yet:
- npm publication
- shadcn/ui components
- persisted filter presets
- pagination and sorting helpers

## Package status

The packages are prepared for npm publication, but not published yet.

---

## The problem

Admin dashboards often define the same filter logic in multiple places:

```
UI state   →   URL search params   →   API query   →   table state   →   active chips
```

Each layer needs slightly different plumbing. You end up writing ad-hoc string parsing, inconsistent URL encoding, and fragile boolean/date/array coercion that diverges across projects.

FilterBridge provides a small schema layer that makes all these representations consistent from a single definition.

---

## Quick example

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

const invoiceFilters = defineFilters({
  search: text(),
  status: select(['draft', 'pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'recurring', 'manual-review']),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

// Parse from URL (or any plain object with string values)
const state = parseFilters(invoiceFilters, {
  search: 'acme',
  status: 'paid',
  tags: 'urgent,recurring',
  archived: 'false',
  issuedAtFrom: '2026-01-01',
  issuedAtTo: '2026-01-31',
  amountMin: '100',
  amountMax: '2500',
})

// Backend DTO — undefined, empty arrays, and empty ranges removed
const dto = toQueryDto(invoiceFilters, state)
// {
//   search: 'acme',
//   status: 'paid',
//   tags: ['urgent', 'recurring'],
//   archived: false,
//   issuedAt: { from: '2026-01-01', to: '2026-01-31' },
//   amount: { min: 100, max: 2500 },
// }

// URL search params — deterministic serialization
const params = toSearchParams(invoiceFilters, state)
// search=acme&status=paid&tags=urgent%2Crecurring&archived=false&...
```

TypeScript infers the full state type from the schema, including literal union types:

```ts
import type { InferFilterState } from '@filterbridge/core'

type InvoiceFilterState = InferFilterState<typeof invoiceFilters>
// {
//   search?: string
//   status?: 'draft' | 'pending' | 'paid' | 'failed'
//   tags?: Array<'urgent' | 'recurring' | 'manual-review'>
//   archived?: boolean
//   issuedAt?: { from?: string; to?: string }
//   amount?: { min?: number; max?: number }
// }
```

---

## React example

```tsx
import { defineFilters, multiSelect, text } from '@filterbridge/core'
import { useFilterBridge } from '@filterbridge/react'

const filters = defineFilters({
  search: text(),
  status: multiSelect(['pending', 'paid', 'failed']),
})

export function InvoiceFilters() {
  const bridge = useFilterBridge(filters, {
    initialState: { search: 'acme' },
    onChange(state) {
      // called after every change — use this to trigger data fetching
      console.log(state)
    },
  })

  return (
    <form>
      <input
        value={bridge.state.search ?? ''}
        onChange={(e) => bridge.set('search', e.target.value)}
      />

      <button type="button" onClick={() => bridge.set('status', ['paid'])}>
        Paid
      </button>

      <button type="button" onClick={() => bridge.clear('status')}>
        Clear status
      </button>

      <button type="button" onClick={() => bridge.reset()}>
        Reset all
      </button>

      {bridge.hasActiveFilters && (
        <span>{bridge.activeFilterCount} active filters</span>
      )}
    </form>
  )
}
```

`useFilterBridge` keeps state clean automatically: setting a filter to `''`, `[]`, or `{}` removes it instead of leaving empty values around.

---

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@filterbridge/core`](./packages/core) | Filter schema DSL, parsing, serialization, query DTO | pre-alpha |
| [`@filterbridge/react`](./packages/react) | `useFilterBridge` React hook | pre-alpha |

Both packages ship ESM and CJS. TypeScript declarations are bundled.

Not yet published. See [Roadmap](#roadmap).

---

## Demo

A local Vite + React app demonstrates all filter types in a simulated invoice admin screen.

```bash
pnpm install
pnpm demo
```

Open [http://localhost:5173](http://localhost:5173).

Change any filter and watch the React state, backend DTO, and URLSearchParams update live in the output panel on the right.

See [`apps/demo/README.md`](./apps/demo/README.md) for details.

---

## Core API

Full reference: [`docs/api/core.md`](./docs/api/core.md)

### `defineFilters(schema)`

Defines a typed filter schema. The schema is the single source of truth for parsing, serialization, and DTO generation.

```ts
const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
})
```

### `parseFilters(schema, input)`

Parses untrusted input into typed filter state. Accepts `Record<string, unknown>` or `URLSearchParams`. Invalid values are discarded silently.

### `toSearchParams(schema, state)`

Serializes filter state into `URLSearchParams`. Empty values are omitted. Output is deterministic.

### `toQueryDto(schema, state)`

Converts filter state into a backend-friendly object. Strips undefined values, empty arrays, and empty range objects.

### Filter factories

| Factory | State type | URL format |
|---------|------------|------------|
| `text()` | `string \| undefined` | `search=invoice` |
| `select(options)` | `"opt1" \| "opt2" \| undefined` | `status=paid` |
| `multiSelect(options)` | `Array<"opt1" \| "opt2"> \| undefined` | `tags=urgent,review` |
| `boolean()` | `boolean \| undefined` | `active=true` |
| `dateRange()` | `{ from?: string; to?: string } \| undefined` | `createdAtFrom=…&createdAtTo=…` |
| `numberRange()` | `{ min?: number; max?: number } \| undefined` | `amountMin=…&amountMax=…` |

---

## React API

Full reference: [`docs/api/react.md`](./docs/api/react.md)

### `useFilterBridge(schema, options?)`

Options:

| Option | Type | Description |
|--------|------|-------------|
| `initialState` | `Partial<InferFilterState<TSchema>>` | Initial filter values |
| `onChange` | `(state) => void` | Called after every state change |

Returns:

| Property | Type | Description |
|----------|------|-------------|
| `state` | `InferFilterState<TSchema>` | Current typed filter state |
| `set(key, value)` | `void` | Update one filter |
| `setMany(values)` | `void` | Update multiple filters at once |
| `clear(key)` | `void` | Remove one filter |
| `reset()` | `void` | Clear all filters to `{}` |
| `hasActiveFilters` | `boolean` | `true` when any filter is active |
| `activeFilterCount` | `number` | Count of active filters |
| `toQueryDto()` | `InferFilterState<TSchema>` | Current state as backend DTO |
| `toSearchParams()` | `URLSearchParams` | Current state as URL params |

---

## Why not just TanStack Table?

TanStack Table is a headless table engine with its own column filter model. FilterBridge is not a table engine.

FilterBridge focuses on a different problem: the filter *contract* around an admin list — what filters exist, how they are parsed from a URL, how they are serialized back, and how they become a backend query DTO.

You can use both together. TanStack Table handles the table; FilterBridge handles the filter schema, URL round-trip, and backend DTO. A dedicated adapter could bridge the two — but that is out of scope today.

---

## Why not just nuqs?

nuqs is excellent at syncing React state with URL query strings. If your primary need is type-safe URL state management, nuqs may be enough.

FilterBridge targets a narrower problem: admin list filters defined as a typed schema, with consistent parsing rules, serialization, and backend DTO generation. The explicit filter types (select, multiSelect, dateRange, numberRange) carry semantic meaning that drives the parsing and serialization behavior.

A future adapter could let you feed `useFilterBridge` state into nuqs for URL sync. For now, `useFilterBridge` manages in-memory state only.

---

## Non-goals

FilterBridge is not and will not become:

- a table or grid renderer
- a replacement for TanStack Table
- a replacement for nuqs
- a UI component library
- a form library
- a backend query builder (no SQL, no ORM integration)
- a validation library (no Zod, no Valibot)
- a state management library
- a data fetching library
- a full admin framework

See [`docs/concepts/non-goals.md`](./docs/concepts/non-goals.md) for the reasoning behind these boundaries.

---

## Architecture

```
@filterbridge/core
  Pure TypeScript. No React dependency.
  Defines filter schemas, parses inputs, serializes URLSearchParams, builds DTOs.

@filterbridge/react
  React adapter. Depends on @filterbridge/core.
  Manages local filter state through useFilterBridge.

apps/demo
  Vite + React app. Not published.
  Demonstrates core and react working together.
```

Planned future packages (not implemented):

```
@filterbridge/next      — Next.js App Router helpers
@filterbridge/tanstack  — TanStack Table column filter adapter
```

See [`docs/concepts/architecture.md`](./docs/concepts/architecture.md) for more detail.

---

## Roadmap

Completed:
- [x] Wave 1 — Monorepo foundation, TypeScript, build pipeline, test runner
- [x] Wave 2 — Core DSL, `parseFilters`, `toSearchParams`, `toQueryDto`
- [x] Wave 3 — `useFilterBridge` React hook
- [x] Wave 4 — Vite + React demo app
- [x] Wave 5 — Documentation pass

Planned:
- [ ] Wave 6 — Browser URL synchronization helpers
- [ ] Wave 7 — TanStack Table adapter
- [ ] Wave 8 — Next.js App Router adapter
- [ ] Wave 9 — Package hardening and `npm pack` validation
- [ ] Wave 10 — First release candidate (`v0.1.0`) and npm publication

---

## Development

Requirements: Node.js 18+, pnpm 8+

```bash
# Install dependencies
pnpm install

# Build library packages
pnpm build

# Run all tests
pnpm test

# Type check all packages
pnpm typecheck

# Run the demo app
pnpm demo

# Build the demo for static hosting
pnpm demo:build

# Lint
pnpm lint

# Format
pnpm format
```

---

## License

MIT
