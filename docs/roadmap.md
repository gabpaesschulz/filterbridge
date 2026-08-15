# FilterBridge Roadmap

This roadmap describes planned and possible future work. No dates are promised.

FilterBridge stays narrow by design. Items here are candidates, not commitments.

**Current version:** `0.2.0`. See [the release notes](./releases/v0.2.0.md) for what shipped.

---

## Shipped in `0.2.0`

Moved here from the sections below rather than deleted, so the roadmap shows what it delivered.

- [x] Repeated query params in `multiSelect` — `tags=a&tags=b` as well as `tags=a,b`
- [x] `popstate` handling — `usePopstateSync` in `@filterbridge/browser/react`, paired with
      `useFilterBridge().syncState`
- [x] Default values per filter — `select`, `multiSelect` and `boolean` accept `{ default }`, plus
      `getDefaultFilterState` and `isAtDefault`
- [x] Serialization validates against the schema, instead of only parsing doing so
- [x] Continuous integration — Linux and Windows, Node 18/20/22, plus a demo build and a changeset
      check on every pull request
- [x] Demo deploy story — [deploy guide](./guides/deploy-demo.md) now covers the Vercel Root
      Directory requirement that silently breaks the build

---

## Shipped in `0.3.0`

Delivered by [Sprint 1](./sprints/sprint-1/README.md).

- [x] `pnpm format:check` in CI — one mechanical Prettier pass over the repository, then a `format`
      job that fails a pull request introducing unformatted files
- [x] Optional custom URL keys for `dateRange` and `numberRange` — `keys: { from, to }` /
      `keys: { min, max }`, with key derivation collapsed from four copies into one in
      `@filterbridge/core`. `defineFilters` now throws on a duplicate param key
- [x] The demo's colour-contrast violations — palette re-measured against WCAG AA, plus
      `pnpm demo:a11y`, a real-Chromium axe run that can check contrast where the jsdom suite
      structurally cannot

---

## `0.2.x` — Stability and ergonomics

Ongoing improvements to the existing packages. No new packages planned.

Most of this section is now planned work: [Sprint 1](./sprints/sprint-1/README.md) covers the two
housekeeping items, the custom key suffixes and the Next.js examples, and targets `0.3.0`.

- [ ] Better examples for the Next.js App Router pattern (client + server components)
- [ ] Custom URL key for the scalar filters — `text('search')` serializing to `q`. The range option
      is deliberately named `keys`, leaving `key: string` free for this
- [ ] Fix the demo's colour-contrast violations. Tracked as [housekeeping](#housekeeping)
- [ ] Bug fixes as they are reported

---

## `0.3.x` — Adapter improvements

Improvements to existing adapters based on real-world usage feedback.

- [ ] Investigate pagination and sorting helpers (design exploration, not committed)
- [ ] TanStack Table examples with server-side filtering
- [ ] Improved `@filterbridge/next` examples for common patterns
- [ ] React Router integration investigation
- [ ] Optional query key helper for TanStack Query (`createFilterQueryKey`)
- [ ] Active filter chips as a headless helper — `isAtDefault` is exported partly for this

---

## `v1.0` candidates

Prerequisites before marking the API stable:

- [ ] **Narrow `InferFilterState` optionality.** A filter with a default is never absent from a
      parsed state, and since `0.2.0` never absent from hook state either, so it could be typed as
      required rather than optional. This is a breaking type change and deserves its own release —
      see [ADR-002 §5](./decisions/002-default-values.md) for why it was deferred and why the case
      for doing it got stronger, not weaker.
- [ ] API compatibility matrix across supported React and Next.js versions
- [ ] No breaking changes pending
- [ ] Public API finalized based on real-world usage
- [ ] Migration guide from `v0.x` if breaking changes were necessary

---

## Housekeeping

Known, deliberately deferred, and easy to lose track of once a sprint closes.

_Nothing is outstanding._ Sprint 1 closed both entries that lived here — `pnpm format:check` is a CI
job, and the demo's palette clears WCAG AA with `pnpm demo:a11y` to keep it that way.

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
