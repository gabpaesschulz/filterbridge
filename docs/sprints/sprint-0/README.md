# Sprint 0 — Post-release hardening

> ## 📁 Historical record
>
> These files were written **during** Sprint 0, by the sessions doing the work, and they are kept
> because the reasoning behind a decision is worth more than the decision alone. They are **not**
> specifications and they are **not** current documentation.
>
> Several of them state things that stopped being true before the sprint closed — a code review at
> the end found two infrastructure P0s, a P0 in how defaults reached the backend DTO, and narrowed
> which filters may declare a default at all. Only headers that were **factually wrong** have been
> corrected, with a note. The bodies are deliberately untouched: their value is in showing what was
> believed at the time, including where that turned out to be incomplete.
>
> **For what the code actually does now:**
> [API reference](../../api/) · [ADR-002 — default values](../../decisions/002-default-values.md) ·
> [v0.2.0 release notes](../../releases/v0.2.0.md)

First maintenance sprint after the `v0.1.0` publish. Focus is correctness in already-published
code, closing the gap between documented and actual behavior, and the infrastructure a published
package is expected to have.

**Created:** 2026-08-13
**Closed:** 2026-08-13
**Baseline commit:** `773adef`
**Target release:** `0.2.0` — retargeted from `0.1.1` once tasks 5, 6 and 7 added public API. See
[task 10](./10-regression-tests-and-release.md) and [`docs/releases/v0.2.0.md`](../../releases/v0.2.0.md).

---

## Baseline health

Everything the project currently measures is green:

| Check            | Result                            |
| ---------------- | --------------------------------- |
| `pnpm test`      | 299 passing / 17 files            |
| `pnpm lint`      | clean                             |
| `pnpm typecheck` | clean (5 packages)                |
| `pnpm build`     | dual ESM/CJS + `.d.ts` / `.d.cts` |

The defects in this sprint were found by exercising the public API directly, not by reading the
test output. All P0 items below reproduce on the published `0.1.0` code and none of them are
caught by the existing suite — that gap is itself a task ([task 10](./10-regression-tests-and-release.md)).

---

## Tasks

| #   | Task                                                                                      | Priority | Area               |
| --- | ----------------------------------------------------------------------------------------- | -------- | ------------------ |
| 1   | [Repeated query params are silently dropped](./01-repeated-query-params.md) ✅            | P0       | `core`             |
| 2   | [`NaN` and `Infinity` leak into URL and DTO](./02-non-finite-numbers.md) ✅               | P0       | `core`             |
| 3   | [Serialization does not validate against the schema](./03-serialization-validation.md) ✅ | P0       | `core`             |
| 4   | [Empty and whitespace values leak into output](./04-empty-value-normalization.md) ✅      | P0       | `core`             |
| 5   | [Hook cannot be synchronized from outside](./05-external-state-sync.md) ✅                | P1       | `react`, `browser` |
| 6   | [`reset()` semantics diverge from the spec](./06-reset-semantics.md) ✅                   | P1       | `react`, docs      |
| 7   | [Per-filter defaults and `getDefaultFilterState`](./07-filter-defaults.md) ✅             | P1       | `core`             |
| 8   | [Three defects in the demo app](./08-demo-fixes.md) ✅                                    | P2       | `demo`             |
| 9   | [No CI workflow](./09-ci-workflow.md) ✅                                                  | P2       | infra              |
| 10  | [Regression tests and `0.2.0` release](./10-regression-tests-and-release.md) ✅           | P2       | all                |

### Found by the closing code review, after tasks 1–10

Not planned tasks; they came out of reviewing the ten above against the code rather than against
their own task files. Two of them changed public API.

| Finding                                                                                                                                                                      | Severity | Outcome                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| `pnpm typecheck` and `pnpm test` failed on a clean clone, so CI could never have gone green                                                                                  | P0       | `build` moved ahead of the other checks                             |
| `test.projects` is a Vitest 3 option, silently ignored on Vitest 2 — every per-package config was inert, and the `syncState` no-loop test was passing against a stale `dist` | P0       | real `vitest.workspace.ts`; all `@filterbridge/*` resolve to source |
| `toQueryDto` omitted values equal to their default, so a page filtering by `status: 'paid'` told the backend "no filter"                                                     | P0       | the DTO carries defaults; the URL still omits them                  |
| `text`, `dateRange` and `numberRange` accepted a default, which is incoherent once `clear()` means "back to the default"                                                     | design   | narrowed to `select` / `multiSelect` / `boolean`                    |

The last two are recorded in [ADR-002](../../decisions/002-default-values.md).

---

## Suggested execution order

```
1 → 2 → 4 → 3      core correctness, one changeset, same code paths
9                  CI in place before the riskier changes land
8                  visible wins in the published demo
7 → 6 → 5          API changes — discuss before implementing
```

Tasks 1–4 all touch `parse-filters.ts`, `search-params.ts`, and `query-dto.ts`. Doing them as one
group avoids three rounds of conflicting edits to the same switch statements.

Tasks 5–7 change or extend the public API. They are grouped last on purpose: each one deserves a
decision before code, and none of them is required for the `0.1.1` bug-fix release.

---

## Release impact

Tasks 3 and 4 change serialization output for inputs that are currently accepted. That is
technically a breaking change, even though the affected inputs are invalid states that already
round-trip incorrectly. The project is `0.x` and documented as experimental, so `0.1.1` is
acceptable — but the behavior change must be spelled out in the changeset, not buried.

See [task 10](./10-regression-tests-and-release.md) for the release checklist.

---

## Not in this sprint

Deliberately excluded, tracked in [docs/roadmap.md](../../roadmap.md):

- Custom key suffixes for `dateRange` / `numberRange`
- Pagination and sorting adapters
- React Router integration
- `createFilterQueryKey` for TanStack Query
