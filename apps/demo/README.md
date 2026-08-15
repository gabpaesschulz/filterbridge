# FilterBridge Demo

A local Vite + React app demonstrating `@filterbridge/core`, `@filterbridge/react`, `@filterbridge/browser` and `@filterbridge/tanstack` in a realistic invoice admin screen.

---

## Running the demo

From the repository root:

```bash
pnpm install
pnpm demo
```

Then open [http://localhost:5173](http://localhost:5173).

Or run directly via the package filter:

```bash
pnpm --filter @filterbridge/demo dev
```

## Building for static hosting

```bash
pnpm demo:build
# or
pnpm --filter @filterbridge/demo build
```

Output goes to `apps/demo/dist/`.

---

## What the demo shows

The demo simulates an invoice admin screen. The filter schema is defined in [`src/filters.ts`](./src/filters.ts):

```ts
const invoiceFilters = defineFilters({
  search: text(),
  status: select(['draft', 'pending', 'paid', 'failed', 'cancelled']),
  tags: multiSelect(['urgent', 'recurring', 'international', 'manual-review']),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})
```

All six MVP filter types are represented.

### Filter controls (left column)

| Filter     | Type            | Notes                               |
| ---------- | --------------- | ----------------------------------- |
| `search`   | `text()`        | Free-text input                     |
| `status`   | `select()`      | Single value from a fixed list      |
| `tags`     | `multiSelect()` | Multiple values from a fixed list   |
| `archived` | `boolean()`     | Three-option select: Any / Yes / No |
| `issuedAt` | `dateRange()`   | From / To date inputs               |
| `amount`   | `numberRange()` | Min / Max number inputs             |

### Live output panel (right column)

Four panels update on every keystroke or interaction:

1. **React state** — the raw typed filter state from `bridge.state`
2. **Backend DTO** — `bridge.toQueryDto()`, with empty and invalid values stripped
3. **URLSearchParams** — `bridge.toSearchParams()`, shown as a full URL string
4. **TanStack columnFilters** — `toTanStackColumnFilters()`, ready to pass to `useReactTable`

Below them, a TanStack Table renders the invoice rows that survive the current filters, using
`filterBridgeFilterFns` for client-side filtering.

### URL synchronization

The demo uses `@filterbridge/browser` to keep the browser URL in sync with filter state:

- **On load:** `parseFiltersFromUrl(invoiceFilters)` initializes the bridge from the current URL.
- **On change:** `pushUrlFilters(invoiceFilters, state)` adds a history entry via `window.history.pushState`, so Back and Forward have somewhere to go.
- **On back/forward:** `usePopstateSync(invoiceFilters, bridge.syncState)` re-reads the URL and applies it without firing `onChange` — which is what stops the write-back from looping.
- Non-filter params (e.g. `page`, `tab`) are preserved in the URL automatically.
- Reloading the page restores filters from the URL.

### Interactions to try

- Type in the search box — watch all three outputs update and the browser URL change
- Select a status or check multiple tags — observe array serialization
- Change "archived" between Any / Yes / No — `archived=false` is a real filter value and stays in the URL; only "Any" removes it
- Fill in a date range — see `issuedAtFrom` / `issuedAtTo` in the URL
- Click **Fill example** — populates all filters at once
- Click **Reset filters** — clears everything and removes filter params from the URL
- Copy the browser URL and open it in a new tab — filters are restored
- Press the browser's Back and Forward buttons — the filter UI follows, with no page reload

---

## What is not in this demo

- Data fetching — the invoice rows are a static fixture in `src/data/invoices.ts`, filtered
  client-side; there are no API calls
- Pagination or sorting
- Persisted state via `localStorage`
- Schema defaults — `invoiceFilters` declares none, so every filter starts absent

---

## Relation to the library packages

The demo is a consumer of `@filterbridge/core`, `@filterbridge/react`, `@filterbridge/browser` (both entry points) and `@filterbridge/tanstack`. It does not export anything and is not published.

It is also the only place the packages are exercised together, so `pnpm demo:build` runs in CI as its own job, and an axe-core accessibility suite over the rendered app runs as part of `pnpm test`.
