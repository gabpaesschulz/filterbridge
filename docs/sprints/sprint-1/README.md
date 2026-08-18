# Sprint 1 — Ergonomics and debt

Second maintenance sprint, and the first that starts from a repository that is entirely green. Its
subject is the `0.2.x` line of [the roadmap](../../roadmap.md#02x--stability-and-ergonomics): the
two housekeeping items Sprint 0 deferred, one ergonomics gap that keeps coming back in the API
reference, and the Next.js example the guide promises but does not give.

**Created:** 2026-08-15
**Closed:** 2026-08-15
**Status:** closed. Five planned tasks done, one found and deferred to Sprint 2.
**Baseline commit:** `d50c984`
**Release:** `0.3.1`. `0.3.0` was cut, then a schema-validation pass landed before the publish and
took the number to `0.3.1`. See [task 5](./05-release.md) for why a minor and not a patch.

## Closing health

| Check               | Baseline               | Now                                           |
| ------------------- | ---------------------- | --------------------------------------------- |
| `pnpm test`         | 538 passing / 28 files | **581 passing / 29 files**                    |
| `pnpm lint`         | clean                  | clean                                         |
| `pnpm typecheck`    | clean                  | clean                                         |
| `pnpm build`        | clean                  | clean                                         |
| `pnpm format:check` | **fails — 122 files**  | **clean, and enforced in CI**                 |
| `pnpm demo:a11y`    | did not exist          | **zero violations**                           |
| `.smoke/`           | 39 ESM / 29 CJS        | 66 ESM / 50 CJS, against the release tarballs |

The 538 baseline tests pass **unmodified**, which was the acceptance criterion guarding task 2's
refactor of the parse and serialize paths.

---

## Baseline health

| Check               | Result                                     |
| ------------------- | ------------------------------------------ |
| `pnpm test`         | 538 passing / 28 files                     |
| `pnpm lint`         | clean                                      |
| `pnpm typecheck`    | clean (5 packages, after `pnpm build`)     |
| `pnpm build`        | dual ESM/CJS + `.d.ts` / `.d.cts`          |
| `pnpm format:check` | **fails — 122 files**, 54 of them Markdown |

Nothing here is a P0. Sprint 0 was about a published package being wrong; this one is about a
published package being awkward. That difference sets the priorities below — the only task that
touches parsing or serialization is task 2, and it is additive.

> **The 122 figure is wrong**, and the 68/54 split with it. It was measured on a Windows clone with
> `core.autocrlf=true`, where every file on disk has CRLF while the repository stores LF and
> Prettier's `endOfLine` default is `lf` — so it counted every file it could see. The real number
> was **74: 25 code and 49 Markdown**. Left uncorrected above because a baseline is a record of what
> was believed at the time; see [task 1](./01-formatting-and-format-check.md#outcome).

---

## Tasks

| #   | Task                                                                            | Priority | Area                      | Status              |
| --- | ------------------------------------------------------------------------------- | -------- | ------------------------- | ------------------- |
| 1   | [Formatting pass and `format:check` in CI](./01-formatting-and-format-check.md) | P1       | infra                     | done                |
| 2   | [Custom URL keys for `dateRange` and `numberRange`](./02-custom-range-keys.md)  | P1       | `core`, `browser`, `next` | done                |
| 3   | [The demo's 25 colour-contrast violations](./03-demo-contrast.md)               | P2       | `demo`                    | done                |
| 4   | [Next.js App Router example that runs](./04-next-app-router-example.md)         | P2       | docs, examples            | done                |
| 5   | [`0.3.0` release](./05-release.md)                                              | P2       | all                       | done                |
| 6   | [`onChange` fires during render](./06-onchange-fires-during-render.md)          | P1       | `react`                   | **open** → Sprint 2 |

### Task 6 was not planned

[Task 4](./04-next-app-router-example.md) said building the example might surface a defect, and that
finding one would be the point. It surfaced two.

**In the guide, and fixed.** Back/forward did not work the way
[`docs/guides/next-app-router.md`](../../guides/next-app-router.md) claimed, for two independent
reasons: `router.replace` leaves no history entry to go back to, and a server re-render does not
reach an uncontrolled hook's state. Both corrected in the guide, both demonstrated in the example.

**In `@filterbridge/react`, and deferred.**
[`useFilterBridge` fires `onChange` from inside its `setState` updater](./06-onchange-fires-during-render.md),
which React runs during the render phase, so an `onChange` that navigates warns and is unsafe.
Pre-existing since `0.1.0` and invisible until now, because `apps/demo` writes to `window.history`
rather than to React state. It ships in `0.3.1` unfixed, with a one-line workaround documented in
both the guide and the example.

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

**Settled: `0.3.1`.** Task 2 landed with the collision throw, so the release carries new API surface
plus behavior changes. `0.3.0` was versioned and then superseded before publishing by a
schema-validation pass; the delta a user sees is still `0.2.0 → 0.3.1`, and it is a minor.

---

## Not in this sprint

Deliberately excluded, tracked in [docs/roadmap.md](../../roadmap.md):

- Narrowing `InferFilterState` optionality for defaulted filters — a `v1.0` item, see
  [ADR-002 §5](../../decisions/002-default-values.md)
- Pagination and sorting adapters
- React Router integration
- `createFilterQueryKey` for TanStack Query
- Active filter chips as a headless helper
