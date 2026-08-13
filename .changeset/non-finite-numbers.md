---
'@filterbridge/core': patch
'@filterbridge/react': patch
---

Keep `NaN` and `Infinity` out of URLs, DTOs and React state.

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
