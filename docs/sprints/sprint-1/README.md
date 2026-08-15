# Sprint 1 — Ergonomics and debt

Second maintenance sprint, and the first that starts from a repository that is entirely green. Its
subject is the `0.2.x` line of [the roadmap](../../roadmap.md#02x--stability-and-ergonomics): the
two housekeeping items Sprint 0 deferred, one ergonomics gap that keeps coming back in the API
reference, and the Next.js example the guide promises but does not give.

**Created:** 2026-08-15
**Status:** open
**Baseline commit:** `d50c984`
**Target release:** `0.3.0` — see [task 5](./05-release.md) for why a minor and not a patch.

---

## Baseline health

| Check | Result |
|-------|--------|
| `pnpm test` | 538 passing / 28 files |
| `pnpm lint` | clean |
| `pnpm typecheck` | clean (5 packages, after `pnpm build`) |
| `pnpm build` | dual ESM/CJS + `.d.ts` / `.d.cts` |
| `pnpm format:check` | **fails — 122 files**, 54 of them Markdown |

Nothing here is a P0. Sprint 0 was about a published package being wrong; this one is about a
published package being awkward. That difference sets the priorities below — the only task that
touches parsing or serialization is task 2, and it is additive.

---

## Tasks

| # | Task | Priority | Area |
|---|------|----------|------|
| 1 | [Formatting pass and `format:check` in CI](./01-formatting-and-format-check.md) | P1 | infra |
| 2 | [Custom URL keys for `dateRange` and `numberRange`](./02-custom-range-keys.md) | P1 | `core`, `browser`, `next` |
| 3 | [The demo's 25 colour-contrast violations](./03-demo-contrast.md) | P2 | `demo` |
| 4 | [Next.js App Router example that runs](./04-next-app-router-example.md) | P2 | docs, examples |
| 5 | [`0.3.0` release](./05-release.md) | P2 | all |

---

## Suggested execution order

```
1                  mechanical, 122 files — land it alone, before anything else
2                  the only code change; core first, then browser and next
3 → 4              independent of each other and of 2
5                  closes the sprint
```

Task 1 first is not a preference. It rewrites 122 files, and every other task in the sprint edits
files inside that set — doing it second buries three real diffs in a whitespace commit.

Task 2 is the one to discuss before writing code. It adds a public option to two builders and, more
importantly, forces a decision about where URL key derivation lives: today the `From`/`To`/`Min`/
`Max` suffixes are hardcoded independently in three packages, which is exactly the drift that made
[Sprint 0 task 1](../sprint-0/01-repeated-query-params.md) a data-loss bug.

---

## Release impact

Task 2 is additive: schemas that declare no custom keys serialize and parse byte-for-byte as they do
today, and that is an acceptance criterion. Nothing else in the sprint changes runtime behavior —
task 1 is whitespace, task 3 is demo CSS, task 4 is documentation.

The version bump is therefore a judgement call rather than a forced one. [Task 5](./05-release.md)
argues for `0.3.0`.

---

## Not in this sprint

Deliberately excluded, tracked in [docs/roadmap.md](../../roadmap.md):

- Narrowing `InferFilterState` optionality for defaulted filters — a `v1.0` item, see
  [ADR-002 §5](../../decisions/002-default-values.md)
- Pagination and sorting adapters
- React Router integration
- `createFilterQueryKey` for TanStack Query
- Active filter chips as a headless helper
