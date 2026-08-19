# FilterBridge Roadmap

This roadmap describes planned and possible future work. No dates are promised.

FilterBridge stays narrow by design. Items here are candidates, not commitments.

**Current version:** `0.4.0`. See [the release notes](./releases/v0.4.0.md) for what shipped.

`0.3.0` was cut and never published — a schema-validation pass landed before the publish and took the
number to `0.3.1`.

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

## Shipped in `0.3.1`

Delivered by [Sprint 1](./sprints/sprint-1/README.md).

- [x] `pnpm format:check` in CI — one mechanical Prettier pass over the repository, then a `format`
      job that fails a pull request introducing unformatted files
- [x] Optional custom URL keys for `dateRange` and `numberRange` — `keys: { from, to }` /
      `keys: { min, max }`, with key derivation collapsed from four copies into one in
      `@filterbridge/core`. `defineFilters` now throws on a duplicate param key
- [x] The demo's colour-contrast violations — palette re-measured against WCAG AA, plus
      `pnpm demo:a11y`, a real-Chromium axe run that can check contrast where the jsdom suite
      structurally cannot
- [x] Better examples for the Next.js App Router pattern —
      [`examples/next-app-router`](../examples/next-app-router), a running Next.js 15 app outside
      the pnpm workspace. Running it corrected two false claims in the guide about back/forward and
      surfaced [one library defect](./sprints/sprint-1/06-onchange-fires-during-render.md)
- [x] Schema mistakes fail at definition time — a `keys` side that does not exist, a padded or empty
      key, a range colliding with itself, and an unrecognised filter kind all throw instead of
      passing in silence and surfacing later as a filter that did nothing

---

## Shipped in `0.4.0`

Delivered by [Sprint 2](./sprints/sprint-2/README.md).

- [x] `onChange` no longer fires during the render phase — navigating from it (`router.push`) is
      safe, the `queueMicrotask` workaround is gone from the guide and the example, and it fires
      once rather than twice under `<React.StrictMode>`.
      [ADR-006](./decisions/006-onchange-timing.md)
- [x] Custom URL key for the scalar filters — `text({ key: 'q' })`, and the same on `select`,
      `multiSelect` and `boolean`. Key derivation now runs through one module for all six filter
      kinds, not just the two ranges
- [x] React 19 in the test matrix — `@filterbridge/react` and `@filterbridge/browser` run their
      suites against React 18 and React 19, so `react: >=18` is checked rather than declared. Strict
      Mode is in the suite for the first time
- [x] `pnpm verify:next-example` — the example's back/forward and clean-console claims are
      re-runnable instead of a sentence in a sprint document
- [x] `CLAUDE.md` is tracked

---

## `0.2.x` — Stability and ergonomics

Ongoing improvements to the existing packages. No new packages planned. Everything
[Sprint 1](./sprints/sprint-1/README.md) took from this list shipped in `0.3.1` above; the heading
keeps its original name so that the sprint records linking to it still resolve.

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

- [ ] **Automate the GitHub Release.** A workflow on tag push, reading
      `docs/releases/v<version>.md`. `v0.3.1`'s release was skipped because `gh` was not installed
      and the checklist offered no alternative; the checklist now writes out the web-UI route, and
      `0.4.0` is the second time it has been done by hand. Let the third repetition justify the
      workflow — permissions, changelog source and a dry run are real work.

Closed: Sprint 1's two entries — `pnpm format:check` is a CI job, and the demo's palette clears
WCAG AA with `pnpm demo:a11y` to keep it that way. Sprint 2's two — `CLAUDE.md` is tracked, and the
`v0.3.1` GitHub Release is created.

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
