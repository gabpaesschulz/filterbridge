# FilterBridge Demo

A local Vite + React app demonstrating `@filterbridge/core`, `@filterbridge/react`, and `@filterbridge/browser` in a realistic invoice admin screen.

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

| Filter | Type | Notes |
|--------|------|-------|
| `search` | `text()` | Free-text input |
| `status` | `select()` | Single value from a fixed list |
| `tags` | `multiSelect()` | Multiple values from a fixed list |
| `archived` | `boolean()` | Toggle |
| `issuedAt` | `dateRange()` | From / To date inputs |
| `amount` | `numberRange()` | Min / Max number inputs |

### Live output panel (right column)

Three panels update on every keystroke or interaction:

1. **React state** — the raw typed filter state from `bridge.state`
2. **Backend DTO** — `bridge.toQueryDto()`, with empty values stripped
3. **URLSearchParams** — `bridge.toSearchParams()`, shown as a full URL string

### URL synchronization

The demo uses `@filterbridge/browser` to keep the browser URL in sync with filter state:

- **On load:** `parseFiltersFromUrl(invoiceFilters)` initializes the bridge from the current URL.
- **On change:** `replaceUrlFilters(invoiceFilters, state)` updates the URL via `window.history.replaceState`.
- Non-filter params (e.g. `page`, `tab`) are preserved in the URL automatically.
- Reloading the page restores filters from the URL.

### Interactions to try

- Type in the search box — watch all three outputs update and the browser URL change
- Select a status or check multiple tags — observe array serialization
- Toggle "archived" — see `archived=true` appear in the URL bar
- Fill in a date range — see `issuedAtFrom` / `issuedAtTo` in the URL
- Click **Fill example** — populates all filters at once
- Click **Reset filters** — clears everything and removes filter params from the URL
- Copy the browser URL and open it in a new tab — filters are restored

---

## What is not in this demo

- Back/forward navigation restoring filter state (no `popstate` handling)
- Data fetching — no real API calls, no list of invoices rendered
- Table rendering — the demo shows filter outputs only
- Pagination or sorting
- Persisted state via `localStorage`

---

## Relation to the library packages

The demo is a consumer of `@filterbridge/core`, `@filterbridge/react`, and `@filterbridge/browser`. It does not export anything and is not published.
