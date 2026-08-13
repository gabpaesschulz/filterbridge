# @filterbridge/core

## 0.2.0

### Minor Changes

- e5f5036: Add per-filter default values, `getDefaultFilterState` and `isAtDefault`

  `select`, `multiSelect` and `boolean` now take an optional configuration object as their last
  argument:

  ```ts
  const schema = defineFilters({
    status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
    pageSize: select(['25', '50', '100'], { default: '25' }),
    archived: boolean({ default: false }),
  })
  ```

  A default is used by `parseFilters` when the key is absent from the input **or** present but
  invalid, and it is **omitted** by `toSearchParams` — so a page sitting at its default state has no
  query string at all, and the round trip still holds.

  **Only filters whose value space is a fixed, enumerable set accept a default.** `text()`,
  `dateRange()` and `numberRange()` take no configuration, and passing one is a type error. Clearing a
  filter returns it to its default, which is coherent for a discrete choice and hostile for continuous
  editing — a text or number input would repopulate itself while the user was still backspacing
  through it. A literal date default is wrong for a different reason: `'2026-01-01'` means something
  else every month. Express those as discrete choices instead:

  ```ts
  period: select(['7d', '30d', '90d'], { default: '30d' })
  ```

  ### The DTO carries defaults; the URL does not

  `toSearchParams` omits a value equal to its default. `toQueryDto` **includes** it. The two outputs
  deliberately carry different bytes:
  - Omitting a default from the URL is compression with a guaranteed decompressor — `parseFilters`
    puts it back on the way in. Nothing is lost.
  - The DTO leaves for a backend that does not run FilterBridge and cannot know the schema, so an
    omitted default is gone. A page at `status: 'paid'` would render "paid" while the backend, handed
    `{}`, returned every row.

  `toQueryDto` applies the same fallback rule as `parseFilters` — absent, empty or invalid becomes the
  default — so `toQueryDto(state)` always equals
  `toQueryDto(parseFilters(schema, toSearchParams(schema, state)))`.

  ### Also added
  - `getDefaultFilterState(schema)` — the state a schema starts from, the same object
    `parseFilters(schema, {})` produces.
  - `isAtDefault(filter, value)` — the comparison the serializers use, exported so adapters and
    active-filter-chip UIs do not re-implement it.
  - `select` and `multiSelect` validate their default against `options` at schema definition and
    **throw** if it does not belong. A default is static configuration, so a typo fails identically on
    every run and is worth catching at definition rather than silently parsing to `undefined`.
  - `FilterConfig<TValue>`, and the `DateRangeValue` / `NumberRangeValue` state shapes that
    `dateRange` and `numberRange` already used inline.

  Schemas without defaults are unaffected: parsing, serialization and DTO output are byte-identical to
  `0.1.0`. The cost of omitting defaults from the URL — bookmarks whose meaning
  follows the code, and "no value" being unreachable for a defaulted filter — is documented in
  [`docs/api/core.md`](https://github.com/gabpaesschulz/filterbridge/blob/main/docs/api/core.md#default-values)
  and recorded in full in
  [ADR-002](https://github.com/gabpaesschulz/filterbridge/blob/main/docs/decisions/002-default-values.md).

### Patch Changes

- e5f5036: Type-check `boolean` in `toQueryDto`, matching `toSearchParams`.

  `toSearchParams` required an actual boolean; `toQueryDto` assigned whatever was in the slot. State
  arriving from `JSON.parse`, `localStorage` or a cast as `{ active: 'true' }` therefore vanished from
  the URL and reached the backend as the string `"true"` — the two serializers disagreed about the
  same state, which is exactly the inconsistency `parseFilters`/`toSearchParams` validation closed for
  `select` and `multiSelect`.

  Found by the round-trip property test, not by hand: `toQueryDto(state)` must equal
  `toQueryDto(parseFilters(schema, toSearchParams(schema, state)))` for every generated state, and
  `boolean` was the last filter type where it did not.

  **Behavior change:** a non-boolean in a `boolean` slot is now omitted from the DTO instead of being
  copied through.

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

- e5f5036: Fix repeated query params being silently dropped in `parseFilters`.

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

- e5f5036: Validate `select` and `multiSelect` against the schema when serializing, not only when parsing.

  `parseFilters` checked values against a filter's `options`; `toSearchParams` and `toQueryDto` did
  not. A value the schema forbids went straight into the URL and into the backend DTO, then vanished
  when the URL was read back — so `parseFilters(schema, toSearchParams(schema, state))` was not
  `state`, and the loss was silent.
  - `toSearchParams` now omits a `select` value that is not a string listed in `options`, drops the
    invalid entries of a `multiSelect`, and omits the key when none survive.
  - `toQueryDto` applies the identical rules, including the type check on `select` that it previously
    lacked entirely (`dto[key] = value` copied through a number or an object as-is).
  - The membership rule now lives in one module and is used by the parser and both serializers, so
    the three directions cannot drift apart again.
  - A dropped value is reported through `console.warn` when `process.env.NODE_ENV !== 'production'`.
    Serialization never throws: it runs inside `useFilterBridge`'s render path, where a bad filter
    value must degrade to a missing key rather than to a blank page.

  **Behavior change:** callers passing values outside a filter's `options` currently see them in the
  URL and in the DTO; after this they will not. That output is already broken — it does not survive a
  re-parse — so no correct integration depends on it, but code reading `toQueryDto` output directly
  will see those keys disappear.

## 0.1.0

### Initial Release

- 2896dad: Initial experimental release of FilterBridge.
  - `@filterbridge/core`: schema-first filter definitions, parsing, URL serialization and backend DTO generation
  - `@filterbridge/react`: React state hook (`useFilterBridge`) for FilterBridge schemas
  - `@filterbridge/browser`: browser URL synchronization helpers (`createFilterUrl`, `pushUrlFilters`, `replaceUrlFilters`)
  - `@filterbridge/tanstack`: TanStack Table adapter (`toTanStackColumnFilters`, `fromTanStackColumnFilters`, `filterBridgeFilterFns`)
  - `@filterbridge/next`: Next.js App Router search params adapter (`parseNextSearchParams`, `createNextFilterHref`)
