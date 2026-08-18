# @filterbridge/react

## 0.3.1

### Patch Changes

- Updated dependencies [dc3d01f]
  - @filterbridge/core@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [c218ac1]
  - @filterbridge/core@0.3.0

## 0.2.0

### Minor Changes

- 221cc0f: Add `syncState()` to `useFilterBridge`, for state that originates outside the component.

  The hook owned its state with no entry point: `initialState` was read once in a `useState`
  initializer, and every mutation (`set`, `setMany`, `clear`, `reset`) came from inside the component.
  There was no way to say "the URL changed, adopt it".

  ```tsx
  const bridge = useFilterBridge(orderFilters, {
    initialState: parseFiltersFromUrl(orderFilters),
    onChange: (state) => pushUrlFilters(orderFilters, state),
  })

  bridge.syncState(parseFiltersFromUrl(orderFilters))
  ```

  `syncState` replaces the whole state rather than merging, so a filter absent from the incoming state
  is removed from the UI — which is what adopting an external source has to mean.

  **It deliberately does not fire `onChange`.** That is the invariant that makes it safe to pair with
  a write-back, not an implementation detail. `onChange` writes state to the URL; `syncState` is
  called _because_ the URL already changed. If it fired `onChange`, every Back press would immediately
  re-push the entry the user had just navigated away from and the button would appear frozen. There is
  an explicit end-to-end test for it.

  The intended pairing is `usePopstateSync` from `@filterbridge/browser/react`, which lands in the
  same release.

  Additive — no existing behavior changes.

- `useFilterBridge` now understands schema defaults: state is always a state some URL parses to.

  `@filterbridge/core` gained per-filter defaults in this release. That changes what the hook has to
  guarantee, because `{}` stops being a valid state for a schema that declares any: an empty query
  string parses back to the defaults, so no URL means "everything cleared".

  Every state write is therefore layered over the schema defaults. Without it, `{}` is reachable
  through `reset()`, `clear(key)`, `set(key, undefined)` and `syncState({})` — and the UI would render
  a filter as cleared while the URL and the backend DTO both read it as its default.

  ```ts
  const schema = defineFilters({
    status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
    search: text(),
  })

  bridge.set('status', 'failed')
  bridge.clear('status')
  bridge.state.status // 'paid' — the default, not undefined

  bridge.clear('search')
  bridge.state.search // undefined — no default, so it really is removed
  ```

  - **`clear(key)`** on a filter with a default returns it to that default. There is no "absent" state
    to return to. It is durable now: the control, the URL, a reload and the DTO all agree.
  - **`reset()`** returns to the page's baseline — `{}` for a schema with no defaults, the defaults
    for a schema that has them. There is no separate `resetToDefaults()`; that is what `reset()` is.
  - **`resetToInitial()`** restores the `initialState` captured at mount, layered over the defaults in
    the same way.
  - **`activeFilterCount`** no longer counts a filter sitting at its default, so an untouched page
    reads "0 active filters" instead of counting filters nobody has touched. The count is the number
    of filters the query string carries — the same question stated two ways. Comparison uses
    `isAtDefault` from `@filterbridge/core` rather than a local reimplementation, so the two cannot
    drift apart.

  **Behavior change, but only for schemas that declare defaults** — which are new in this release, so
  nothing published depends on the old behavior. A schema without defaults behaves byte-identically to
  `0.1.0`, pinned by tests.

  If a filter genuinely needs a reachable, linkable "not filtering" state, do not give it a default.
  Model the extra state as an explicit option instead — `select(['all', 'active', 'archived'])` with a
  default of `'active'` keeps `'all'` reachable. The reasoning is recorded in
  [ADR-002](https://github.com/gabpaesschulz/filterbridge/blob/main/docs/decisions/002-default-values.md).

- 221cc0f: Add `resetToInitial()` to `useFilterBridge`.

  `reset()` and "back to the state this page arrived in" are different operations, and only the first
  existed. `docs/api/react.md` had to suggest `setMany(initialState)` as a workaround.
  - **`resetToInitial()`** — restores the `initialState` passed at mount. It replaces rather than
    merges, so filters added since are removed.
  - **`reset()`** — returns to the page's baseline. For a schema with no defaults that is `{}`, which
    is what it has always done; for a schema that declares defaults it is those defaults. See the
    schema-defaults entry in this release for why.

  ```tsx
  const bridge = useFilterBridge(orderFilters, {
    initialState: parseFiltersFromUrl(orderFilters),
  })

  bridge.reset() // the baseline — nothing filtered, or the schema defaults
  bridge.resetToInitial() // back to the filters the shared link arrived with
  ```

  `initialState` is captured once, on the first render, and cleaned exactly like every other state
  write. Passing a different `initialState` on a later render does not change what `resetToInitial()`
  restores — the hook stays uncontrolled, consistent with how `initialState` already worked for
  initialization. Like the other mutators, it fires `onChange`.

  Additive: for a schema without defaults nothing about `reset()` changes.

### Patch Changes

- e5f5036: Normalize empty and whitespace values on the way out, not just on the way in.

  `parseFilters` trimmed strings and discarded empty ones, but the serializers did neither — so a
  value that could never come _out_ of a parse could still go _into_ a URL or a DTO.
  - `toSearchParams` and `toQueryDto` now trim `text` values and omit them when nothing survives.
    `{ search: '   ' }` produced `search=+++` and `{"search":"   "}`; both are now empty. A padded
    value and its trimmed twin produce the same URL, so the round trip is stable.
  - `toQueryDto` now rebuilds a `dateRange` from its surviving sides instead of passing the object
    through. `{ from: '', to: '2026-01-01' }` emitted `{"from":"","to":"2026-01-01"}` and now emits
    `{"to":"2026-01-01"}`; the key is dropped entirely when neither side survives. An empty string
    reaching a backend is worse than an absent key — `WHERE created_at >= ''` fails where an absent
    key would not.
  - `toSearchParams` now trims the surviving sides of a `dateRange` as well.
  - `cleanFilterState` (`@filterbridge/react`) now treats a range whose sides are all empty strings as
    empty. It previously only removed one whose sides were all nullish, so the `{ from: '', to: '' }`
    shape an emptied `<input type="date">` produces was kept whole.

  **Behavior change:** serializer output is narrower for inputs that were previously accepted. Every
  affected value is one the parser already rejects, so none of them survive a URL round trip today —
  but callers reading `toQueryDto` output directly will see keys disappear where they used to see an
  empty string.

- e5f5036: Keep `NaN` and `Infinity` out of URLs, DTOs and React state.

  A `numberRange` holding a non-finite number was serialized verbatim. `{ amount: { min: NaN, max: 10 } }`
  produced `amountMin=NaN&amountMax=10` in the URL and `{"amount":{"min":null,"max":10}}` over the
  wire — `JSON.stringify` has no `NaN` literal, so the backend received an explicit `null` where the
  frontend meant "no lower bound". `parseFilters` rejects `"NaN"` on the way back in, so the URL form
  did not survive its own round trip either.

  Any UI mapping an input event through `Number()` produces `NaN` for non-numeric input, so this took
  nothing unusual to reach.
  - **`toSearchParams`** and **`toQueryDto`** now guard each side with `Number.isFinite`. A range with
    one finite side keeps that side; a range with none is omitted entirely. `toQueryDto` rebuilds the
    range from its surviving sides instead of copying the original object through, so one bad side no
    longer poisons the whole object.
  - **`parseFilters`** guards with `Number.isFinite` as well. `parseFloat('Infinity')` is `Infinity`
    and the previous `!isNaN` check let it into state, where the serializers dropped it again —
    `amountMin=Infinity` parsed to a state that did not survive being re-serialized. `1e999` is the
    same case without the obvious spelling.
  - **`cleanFilterState`** (`@filterbridge/react`) treats a non-finite number as an empty value, so it
    never enters hook state in the first place.

  **Behavior change:** `JSON.stringify(toQueryDto(...))` can no longer emit `null` for any input, and
  `amountMin=Infinity` in an incoming URL is now ignored rather than parsed. Every affected value was
  already broken end-to-end — not representable in JSON, or not re-parseable from the URL it produced
  — so no correct integration depends on the old output.

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
