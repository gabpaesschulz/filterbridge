---
'@filterbridge/core': patch
'@filterbridge/react': patch
---

Normalize empty and whitespace values on the way out, not just on the way in.

`parseFilters` trimmed strings and discarded empty ones, but the serializers did neither — so a
value that could never come *out* of a parse could still go *into* a URL or a DTO.

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
