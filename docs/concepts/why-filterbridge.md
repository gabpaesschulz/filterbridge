# Why FilterBridge

## The problem in practice

Most admin dashboards have screens that look like this:

```
┌─────────────────────────────────────────────────┐
│  Search: [_____________]  Status: [dropdown ▼]  │
│  From: [date] To: [date]  Tags: [multi-select]  │
│  Amount: [min] – [max]    [Reset] [Apply]        │
├─────────────────────────────────────────────────┤
│  Invoice #  │  Client  │  Status  │  Amount  │  │
│  INV-001    │  Acme    │  Paid    │  $1,200  │  │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

This screen typically needs the same filter information represented in several different ways:

1. **React state** — what the user has entered
2. **URL search params** — so filters survive page refresh and can be shared
3. **API query params** — to send to the backend for data fetching
4. **Active filter chips** — "you have 3 filters active, click × to remove"
5. **Reset behavior** — which values mean "unset" vs "default"

A developer writing this from scratch writes variations of the same logic repeatedly:

```ts
// In React state
const [search, setSearch] = useState('')
const [status, setStatus] = useState<string | undefined>(undefined)
const [tags, setTags] = useState<string[]>([])
const [dateFrom, setDateFrom] = useState('')
const [dateTo, setDateTo] = useState('')
const [amountMin, setAmountMin] = useState<number | undefined>(undefined)
const [amountMax, setAmountMax] = useState<number | undefined>(undefined)

// Parsing from URL
const params = new URLSearchParams(window.location.search)
const search = params.get('search') ?? ''
const status = params.get('status') ?? undefined
// ...and so on for every field

// Building the API query
const query: Record<string, unknown> = {}
if (search) query.search = search
if (status) query.status = status
if (tags.length > 0) query.tags = tags
// ...

// Serializing back to URL
const newParams = new URLSearchParams()
if (search) newParams.set('search', search)
if (status) newParams.set('status', status)
if (tags.length > 0) newParams.set('tags', tags.join(','))
// ...
```

This pattern repeats across every admin screen in every project. Each developer writes slightly different parsing logic. Parsing `"true"` as a boolean happens inconsistently. Arrays may be serialized differently in different screens. Date ranges are sometimes `from`/`to`, sometimes `startDate`/`endDate`, sometimes `dateFrom`/`dateTo`.

## What FilterBridge changes

FilterBridge introduces a single typed schema as the source of truth:

```ts
const orderFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review']),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})
```

From that schema, you get:

```ts
// Parse from any source
const state = parseFilters(orderFilters, new URLSearchParams(window.location.search))

// Build backend DTO
const dto = toQueryDto(orderFilters, state)

// Serialize back to URL
const params = toSearchParams(orderFilters, state)

// React state management
const bridge = useFilterBridge(orderFilters, { onChange: refetch })
```

The parsing rules, serialization format, and DTO shape are consistent by definition. You write the filter types once and every representation follows from that.

## What this is not trying to solve

FilterBridge does not try to replace:

- The table/grid itself (TanStack Table, AG Grid, etc.)
- The routing layer (React Router, Next.js router)
- The state management library (Zustand, Redux, Jotai)
- The form library (React Hook Form, Formik)
- The API client (fetch, axios, ky, React Query)

It is a small, focused layer that sits between your filter UI and these tools, keeping the filter contract consistent.

## Limitations of the current version

FilterBridge v0 solves the most common case but intentionally leaves some things for later:

- No automatic URL synchronization (the browser URL does not update as filters change)
- No per-filter default values
- No `multiSelect` with repeated query params (`tags=a&tags=b`)
- No date validation
- No custom URL key suffixes for ranges

These are planned for future waves. The goal of the first version is to prove the schema contract and get the core parsing/serialization behavior right.
