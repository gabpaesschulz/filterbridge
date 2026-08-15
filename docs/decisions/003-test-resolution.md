# ADR-003: Unit tests resolve to source; `.smoke/` covers the published artifact

**Date:** 2026-08-13
**Status:** accepted

## Context

This repository has five packages that import each other. A test in `packages/browser` imports
`@filterbridge/core` and `@filterbridge/react`, and something has to decide what those specifiers
resolve to.

By default they resolve through `node_modules`, which pnpm symlinks to the sibling package, whose
`package.json` `exports` field points at `dist/`. So without configuration, **a unit test exercises
the last build, not the source next to it.**

That sounds harmless — arguably even more realistic, since `dist/` is what a consumer gets. It is
not. Here is how it failed.

## The failure this decision exists to prevent

Sprint 0 added `useFilterBridge().syncState`, whose defining property is that it does **not** fire
`onChange`. That property is load-bearing: `onChange` writes filter state to the URL, and
`syncState` is called _because_ the URL already changed. If it fired `onChange`, every Back press
would immediately re-push the entry the user had just navigated away from, and the button would
appear frozen.

The sprint wrote an end-to-end test for exactly this —
`packages/browser/src/tests/popstate-round-trip.test.tsx`, which drives back/forward against a fake
history and asserts that neither `onChange` nor a new history entry fires while adopting state from
the URL. The task file called it "the no-loop invariant" test.

A code review then changed `syncState` to fire `onChange`, to check that the test would catch it.

**`pnpm test` stayed green.** All six of that file's tests passed with the invariant removed.

The chain:

1. The root `vitest.config.ts` declared its projects with `test.projects`.
2. `test.projects` is a **Vitest 3** option. This repository is on **Vitest 2.1.9**, where it is an
   unknown key — silently ignored, no warning, no error.
3. So the root run was not a workspace run at all. It was a single project globbing every test file
   in the repository with the root config, and **every per-package `vitest.config.ts` was inert.**
4. One of those inert configs was `packages/browser/vitest.config.ts`, which had already added an
   alias mapping `@filterbridge/react` to source — with a comment explaining this precise hazard.
   The alias never applied under `pnpm test`.
5. `@filterbridge/react` therefore resolved to `packages/react/dist/index.js`: the last build, which
   still contained the correct `syncState`. The test was passing against code the reviewer had not
   modified.

Two things made it hard to notice. The suite reported 507 passing tests, so nothing looked wrong.
And the jsdom tests still ran in jsdom, because each of them carries an inline
`// @vitest-environment jsdom` docblock — the one per-package setting the inert config did not need
to supply.

Running the same file directly with the package's own config (`pnpm --filter @filterbridge/browser
test`) failed with four failures, as it should have. The two commands disagreed, and the one used by
everyone — and by CI — was the one that lied.

## Decision

**Unit tests resolve `@filterbridge/*` to source. `.smoke/` covers the published artifact.**

- `vitest.workspace.ts` at the repository root declares the projects, which is the mechanism Vitest 2
  actually reads.
- `vitest.aliases.ts` exports one alias table, imported by all six project configs, mapping every
  `@filterbridge/*` specifier — including the `@filterbridge/browser/react` subpath — to the
  corresponding `src/` entry.
- `apps/demo` applies it through `test.alias` rather than `resolve.alias`, so `vite build` keeps
  resolving through `dist/` — which is what the `demo build` CI job is verifying and what a real
  consumer does.

The division of labour is the point:

| Suite     | Resolves to        | Answers                                                                     |
| --------- | ------------------ | --------------------------------------------------------------------------- |
| vitest    | `src/`             | Does the code behave correctly?                                             |
| `.smoke/` | installed tarballs | Is the package consumable — export map, ESM and CJS, types, optional peers? |

`.smoke/` covers the artifact **better** than a unit test importing `dist/` ever did: it runs
`npm install` against the real packed tarballs, imports both entry points in both module systems,
and separately verifies that the root entry of `@filterbridge/browser` imports in a project with no
React installed at all. A unit test reaching into `dist/` verified none of that; it only made the
result depend on whether someone had run `pnpm build` recently.

## Consequences

- `pnpm test` runs on a clean clone with no build at all — 538 tests pass with every `dist/` deleted.
  A missing build is no longer an unresolvable-import failure, and a stale one is no longer a false
  green.
- Stack traces point at the source line that broke instead of at bundled output.
- `pnpm typecheck` still requires a build, because `tsc` resolves `@filterbridge/*` through each
  sibling's emitted `.d.ts`. That is worth keeping: it validates the declarations that ship. It is
  why CI runs `build` before `typecheck`, and the CI comment says so.
- `packages/browser/src/tests/popstate-round-trip.test.tsx` deliberately carries **no**
  `@vitest-environment` docblock. It takes `jsdom` from the project config that also supplies the
  alias, so if workspace resolution ever breaks again that file fails loudly with
  `document is not defined` rather than quietly re-running against a stale `dist`.

## If you are about to undo this

The argument for resolving to `dist/` is that it is what consumers get. That argument is correct and
it is already served — by `.smoke/`, which does it properly. What resolving unit tests to `dist/`
actually buys is a suite whose result depends on build freshness, and the specific outcome above: an
invariant test that passes while the invariant is broken.

If you change it, the test to run is the check that caught it. Break `syncState` so it calls
`updateState` instead of `setState`, then run `pnpm test`. Seven tests must go red across
`@filterbridge/react` and `@filterbridge/browser`. If the browser ones stay green, resolution is
reading `dist/` again.

## Related: where a durable decision lives

`CLAUDE.md` is in `.gitignore`, deliberately. It carries working instructions for this repository and
does not survive a clone.

So it cannot be the only record of anything that has to outlive a working copy. **Durable decisions
belong in `docs/decisions/`, and durable plans in `docs/roadmap.md`.** `CLAUDE.md` may summarise
them; it may not be their only home. Sprint documents under `docs/sprints/` are process records with
the same limitation in a different form — they capture what one session believed at the time, and a
later decision can contradict them without their being wrong.

This is written down here because the failure mode is quiet: a sprint records a choice in the file
it is already editing, the file is never committed, and the reasoning is gone by the next clone.
