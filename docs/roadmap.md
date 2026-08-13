# FilterBridge Roadmap

This roadmap describes planned and possible future work. No dates are promised.

FilterBridge stays narrow by design. Items here are candidates, not commitments.

---

## v0.1.x — Stability and ergonomics

Ongoing improvements to the existing packages. No new packages planned.

- [ ] Improve demo deploy story (Vercel/Netlify instructions)
- [x] `popstate` handler for `@filterbridge/browser` — `usePopstateSync` + `useFilterBridge().syncState` update React state on back/forward
- [ ] Better examples for Next.js App Router pattern (client + server components)
- [x] Repeated query params support in `multiSelect` (`tags=a&tags=b` in addition to `tags=a,b`)
- [x] Optional default values per filter in schema — `select`, `multiSelect` and `boolean` accept `{ default }`, plus `getDefaultFilterState(schema)`
- [ ] Optional custom key suffixes for `dateRange` and `numberRange`
- [ ] Bug fixes as they are reported

---

## v0.2.x — Adapter improvements

Improvements to existing adapters based on real-world usage feedback.

- [ ] Investigate pagination and sorting helpers (design exploration, not committed)
- [ ] TanStack Table examples with server-side filtering
- [ ] Improved `@filterbridge/next` examples for common patterns
- [ ] React Router integration investigation
- [ ] Optional query key helper for TanStack Query (`createFilterQueryKey`)

---

## v1.0 candidates

Prerequisites before marking the API stable:

- [ ] API compatibility matrix across supported React and Next.js versions
- [ ] No breaking changes pending
- [ ] Public API finalized based on real-world usage
- [ ] Migration guide from `v0.x` if breaking changes were necessary

---

## Not planned

These items are explicitly out of scope. FilterBridge will not become:

- A table or grid renderer
- A replacement for TanStack Table
- A replacement for nuqs
- A UI component library
- A backend query builder (no SQL, no ORM)
- A full admin framework

See [docs/concepts/non-goals.md](./concepts/non-goals.md) for the reasoning.

---

## Suggesting roadmap items

Open a [feature request](https://github.com/gabpaesschulz/filterbridge/issues/new?template=feature_request.md) on GitHub. Include a description of the problem, not just the desired solution.
