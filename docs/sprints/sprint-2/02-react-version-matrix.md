# Task 2 — React 19 in the test matrix

**Priority:** P1 — `packages/react` claims a compatibility range the repository never exercises
**Area:** infra, `@filterbridge/react`, `@filterbridge/browser`
**Status:** planned

---

## Problem

`packages/react/package.json` declares:

```json
"peerDependencies": { "react": ">=18" }
```

and `packages/browser/package.json` declares the same for its optional peer. The suite runs
`react@^18.3.0` and nothing else. React 19 has been out for the whole life of this package, `>=18`
is a promise about it, and no test in this repository has ever run it.

The place React 19 _does_ run is [`examples/next-app-router`](../../../examples/next-app-router),
which pins `react@^19.0.0` — and that is where the only React defect this project has ever found was
found ([task 1](./01-onchange-fires-during-render.md)). That is one data point, not a trend, but it
points the same way: the untested major is where the bugs were.

Two smaller facts that belong in the same picture:

- **No test renders under `<React.StrictMode>`.** That is [task 1's](./01-onchange-fires-during-render.md#decision-4--how-is-strict-mode-asserted)
  decision 4 to fix for React 18. It is listed here because "fires exactly once" is only fully
  asserted when both halves exist.
- **The example's 26 Playwright assertions were never committed.**
  [Sprint 1 task 4](../sprint-1/04-next-app-router-example.md) records them as the evidence that
  back/forward works, and there is no test file, no Playwright config and no `test` script in
  `examples/next-app-router`. The run happened; the artifact did not survive it. So the React 19
  coverage that exists on paper is not re-runnable, which is close enough to not existing.

## The constraint that shapes every option

`@testing-library/react` is pinned at `^14.3.0` in both `packages/react` and `packages/browser`.
**RTL 14 does not support React 19.** Support for both majors starts at RTL 16, which still supports
React 18.

So every option below has the same first step — RTL `14 → 16` across both packages — and that step
has to be verified on React 18 on its own before any React 19 work starts, because it can move
behavior in the 169 tests those two packages own — 92 in `react`, 77 in `browser`, of which 107
actually render React. Do it as its own commit.

---

## Decisions needed before implementing

### Decision 1 — how does a second React version get installed?

| Option                                                                  | Shape                                                                                                                                                                                          | Trade-off                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — pnpm aliased devDependencies + a vitest project**                 | `"react-19": "npm:react@^19"`, `"react-dom-19": "npm:react-dom@^19"`, and a vitest project whose `resolve.alias` maps `react`, `react-dom`, `react-dom/client` and `react/jsx-runtime` to them | Runs locally with a plain `pnpm test`, reproducible, and CI gets it for free. The alias list must be complete — a missed `react/jsx-runtime` silently loads two Reacts, which fails in a confusing way rather than an obvious one              |
| B — a CI leg that reinstalls React 19                                   | An extra matrix leg running `pnpm install` then overriding React, then `pnpm test`                                                                                                             | No local complexity and no new files. Cannot use `--frozen-lockfile`, which CI currently relies on as a real check; and it is not reproducible on a developer's machine, which is where the failure will need debugging                        |
| C — a separate compat package                                           | `packages/react-compat-19` depending on React 19, re-running the suite                                                                                                                         | Fully isolated. Duplicates test files or invents a sharing mechanism, and adds a workspace package that ships nothing                                                                                                                          |
| D — do nothing in vitest; commit the example's Playwright suite instead | React 19 coverage comes from driving the real Next.js app                                                                                                                                      | Highest realism, and it is the Sprint 1 lesson applied. But it covers the paths the example happens to use, not the hook's contract, and the example is outside the workspace on pinned published versions — so it cannot test unreleased code |

**Recommended: A, and D as a separate concern.** A is the one that answers "does `useFilterBridge`
behave the same on React 19", which is the question the peer range is making a claim about. D
answers a different and also worthwhile question, and belongs to [task 4](./04-live-surfaces.md)
where the example is already being touched; committing that Playwright suite there is cheap once
someone is running the example by hand anyway.

B is the tempting shortcut and should be resisted for one specific reason: the first React 19
failure will need to be reproduced locally, and B is the only option where that is not a single
command.

### Decision 2 — which suites run twice?

| Option                                                                | Trade-off                                                                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — `packages/react` and `packages/browser` only**                  | The two packages that import React. 169 tests re-run, well under a second. `apps/demo` also renders React, but it is not a published artifact |
| B — every project that uses jsdom, demo included                      | Also covers the demo's axe suite under React 19                                                                                               |
| C — a curated subset — the `onChange` and `syncState` assertions only | Cheapest, and it is the set task 1 cares about. But it makes "React 19 is supported" mean "the parts we thought to list are supported"        |

**Recommended: A.** The peer dependency is declared by exactly those two packages, so those two
suites are what the claim is about. The demo is an app, and the version it renders is the version
its own `package.json` pins.

### Decision 3 — does React 19 join the CI matrix, or replace a leg?

The `check` job is currently 4 legs: Ubuntu × Node 18/20/22, plus Windows × Node 20. Adding React 19
across all of them makes 8.

| Option                                             | Trade-off                                                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **A — one added leg: Ubuntu · Node 20 · React 19** | One extra leg. React version and Node version are independent axes and cross-producting them tests nothing new |
| B — full cross product                             | Thorough, doubles CI time for no additional signal                                                             |
| C — local only, no CI leg                          | Free, and it will rot within one sprint                                                                        |

**Recommended: A**, named `ubuntu · node 20 · react 19` so a red X says which axis broke — the same
reasoning that gave `format` its own job rather than a matrix leg.

### Decision 4 — what happens if React 19 fails today?

Decide the policy before running it, so the answer is not chosen by how inconvenient the failure is.

**Recommended:** a React 19 failure in `packages/react` or `packages/browser` is a P1 that lands in
this sprint — the peer range promises it works. A failure that traces to RTL, jsdom or another test
dependency rather than to library code gets pinned or worked around and written up, not fixed. A
failure that is genuinely React-19-only in library code, and large, is grounds for narrowing the
peer range to `>=18 <20` in this release and filing the real fix — that is the honest move, and it
is better than leaving a claim standing that CI now proves is false.

---

## Acceptance criteria

- [ ] `@testing-library/react` at `^16` in `packages/react` and `packages/browser`, landed as its
      own commit, with all 169 tests in those two packages passing unmodified on React 18
- [ ] `pnpm test` runs `packages/react` and `packages/browser` against React 18 **and** React 19
- [ ] The React 19 project resolves a single React — assert it, do not assume it; two copies of React
      loaded at once produce hook errors that read like library bugs
- [ ] One added CI leg, named so the failing axis is readable
- [ ] `pnpm typecheck` still clean — check whether `@types/react@19` needs to be part of decision 1
- [ ] A changeset. This is repository infrastructure and publishes nothing, so an empty one
      (`pnpm changeset add --empty`), unless the peer range changes under decision 4 — in which case
      it is a real changeset on `react` and `browser`
- [ ] `docs/concepts/architecture.md` and the root README's compatibility statement reflect what is
      actually tested, rather than what is declared

---

## Related

- [Task 1](./01-onchange-fires-during-render.md) — the Strict Mode half of the same property
- [ADR-003](../../decisions/003-test-resolution.md) — why the root vitest run resolves
  `@filterbridge/*` to source, which is what makes a second project cheap to add
- [Sprint 1 task 4](../sprint-1/04-next-app-router-example.md) — the uncommitted Playwright run
