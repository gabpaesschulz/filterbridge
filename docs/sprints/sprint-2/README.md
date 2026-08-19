# Sprint 2 — The hook's contract with React

Third maintenance sprint. Its subject is the one defect Sprint 1 found and did not fix, and the two
things standing behind it: a React major we claim to support and never run, and a URL-key invariant
that `core` documents as holding when it holds for two filter kinds out of six.

**Created:** 2026-08-18
**Closed:** 2026-08-18
**Status:** closed. All six tasks done.
**Baseline commit:** `200caf4`
**Anchor:** [task 1](./01-onchange-fires-during-render.md), carried over from
[Sprint 1 task 6](../sprint-1/06-onchange-fires-during-render.md)
**Release:** `0.4.0`, versioned and verified. `npm publish` and the GitHub Release are the
maintainer's steps.

---

## Closing health

| Check                      | Baseline               | Now                                                      |
| -------------------------- | ---------------------- | -------------------------------------------------------- |
| `pnpm test`                | 581 passing / 29 files | **849 passing / 45 files**, React 18 **and** React 19    |
| `pnpm lint`                | clean                  | clean                                                    |
| `pnpm format:check`        | clean                  | clean                                                    |
| `pnpm build`               | clean                  | clean                                                    |
| `pnpm typecheck`           | clean                  | clean                                                    |
| `.smoke/`                  | 66 ESM / 50 CJS        | **84 ESM / 60 CJS**, against the `0.4.0` tarballs        |
| `pnpm demo:a11y`           | zero violations        | zero violations                                          |
| `pnpm verify:next-example` | did not exist          | **11/11**, against the `0.4.0` tarballs under `next dev` |

And the four coverage figures the sprint was actually about:

| Measurement                                          | Baseline | Now        |
| ---------------------------------------------------- | -------- | ---------- |
| Tests running under `<React.StrictMode>`             | 0        | **11**     |
| React majors the suite runs against                  | 1        | **2**      |
| Filter kinds whose URL key goes through `param-keys` | 2 of 6   | **6 of 6** |
| Re-runnable checks on `examples/next-app-router`     | 0        | **11**     |

---

## Baseline health

Measured on the baseline commit, on Windows, in this order: `pnpm test`, `pnpm lint`,
`pnpm format:check`, `pnpm build`, `pnpm typecheck`.

| Check               | Result                                           |
| ------------------- | ------------------------------------------------ |
| `pnpm test`         | 581 passing / 29 files, no build                 |
| `pnpm lint`         | clean                                            |
| `pnpm format:check` | clean                                            |
| `pnpm build`        | dual ESM/CJS + `.d.ts` / `.d.cts`, five packages |
| `pnpm typecheck`    | clean, five packages, after `pnpm build`         |

Everything is green, which is why the numbers that matter to this sprint are about coverage rather
than failures.

| Measurement                                          | Value                                                |
| ---------------------------------------------------- | ---------------------------------------------------- |
| Tests running under `<React.StrictMode>`             | **0**                                                |
| React majors the suite runs against                  | **1** — `18.3.x`, while `packages/react` says `>=18` |
| React major `examples/next-app-router` runs          | **19**                                               |
| Filter kinds whose URL key goes through `param-keys` | **2 of 6** — `dateRange` and `numberRange`           |

Each of those is a task below. None of them is a failing test, and that is exactly the point: all
three are places where something is asserted — in a peer range, in a module comment, in a code
comment about Strict Mode — that nothing checks.

> **On the baseline numbers.** Sprint 1's baseline recorded "122 unformatted files" and the real
> figure was 74; it had been measured on a Windows clone with `core.autocrlf=true`, so Prettier
> counted every file it could see. The five checks above are transcribed from command output on the
> baseline commit rather than assumed from the last sprint's closing table. The four coverage
> figures come from `grep` over the repository, and the React versions from `package.json` — which
> is the artifact making the claim, so it is the right source to read.

---

## Tasks

| #   | Task                                                                             | Priority | Area                      | Status |
| --- | -------------------------------------------------------------------------------- | -------- | ------------------------- | ------ |
| 1   | [`onChange` fires during the render phase](./01-onchange-fires-during-render.md) | P1       | `react`                   | done   |
| 2   | [React 19 in the test matrix](./02-react-version-matrix.md)                      | P1       | infra, `react`, `browser` | done   |
| 3   | [Custom URL key for the scalar filters](./03-scalar-param-keys.md)               | P1       | `core`, `next`            | done   |
| 4   | [Re-run the live surfaces](./04-live-surfaces.md)                                | P2       | `demo`, examples, docs    | done   |
| 5   | [Two open repository questions](./05-repository-housekeeping.md)                 | P3       | repo                      | done\* |
| 6   | [`0.4.0` release](./06-release.md)                                               | P2       | all                       | done   |

### Outcomes

\* Task 5 is done except for one step this session cannot take: creating the `v0.3.1` GitHub
Release. `gh` is not installed and there is no path to github.com from here. The body is ready in
[`docs/releases/v0.3.1.md`](../../releases/v0.3.1.md), the tag exists, and
[the checklist](../../release-checklist.md) now writes out the web-UI route.

Every recommendation was taken as written, except where running the thing said otherwise.

| Task | Recommended                                 | Taken                                                                                                              |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Option B, mirror ref, batching test first   | As recommended. [ADR-006](../../decisions/006-onchange-timing.md)                                                  |
| 2    | Aliased devDependency + a vitest project    | **Changed.** Aliasing installs React DOM 19 against React 18; the tree moved to `tools/react-19`                   |
| 2    | One added CI leg                            | **Not needed.** The React 19 projects run inside `pnpm test`, so all four existing legs cover both majors          |
| 3    | `key` on `FilterConfig`, refactor first     | As recommended, in two commits, 798 tests unmodified across the refactor                                           |
| 4    | Verify against the `.packs/` tarballs       | As recommended — and it has to run under `next dev`, which the plan did not know                                   |
| 5    | Track `CLAUDE.md`, §21 to `docs/marketing/` | As recommended                                                                                                     |
| 5    | Create the `v0.3.1` GitHub Release by hand  | **Handed off.** `gh` is not installed and this session cannot reach GitHub; the checklist now writes out the route |

### The four things running it changed

1. **The React 19 aliasing plan was wrong.** `"react-19": "npm:react@^19"` inside `packages/react`
   installs cleanly and resolves `react-dom@19`'s peer to the React 18 already in that package — and
   a vitest alias cannot rescue it, because vitest externalises `node_modules` and React DOM's own
   `require('react')` never passes through Vite. `tools/react-19` exists so that exactly one React
   is in scope. Its README records the version of the story that does not work.
2. **The obvious way to write task 1's fix passes the whole suite and is broken.** Reading `state`
   from the render closure loses the first of two writes in one handler, and all 80 hook tests wrap
   a single mutator in its own `act()`. The batching assertions were written and run against the old
   implementation before the fix, which is the only reason this is a footnote and not a defect.
3. **The example must be verified under `next dev`, not a production build.** React strips the
   render-phase warning from production builds. Measured rather than assumed: `0.3.1` passes all
   eleven checks under `next start`, and fails the console check under `next dev`.
   `pnpm verify:next-example` refuses a production build for this reason.
4. **`.smoke/` was still asserting a proxy.** `0.3.1` rewrote an arity check to test the ADR-002
   rule instead — and kept `text.length === 0`, the same proxy under another name. It broke when
   `text` gained `key`. Neither smoke suite has an arity check left.

### Why these six

**Task 1 is the sprint.** It is the highest-priority item Sprint 1 found, it is pre-existing since
`0.1.0`, and it makes the pattern the Next.js guide recommends — navigate from `onChange` — warn in
development and be unsafe under concurrent rendering. Everything else here either supports it or is
cheap enough to travel with it.

**Task 2 exists because task 1's fix has to be believable.** The property that broke is "`onChange`
fires exactly once per change", and nothing in the repository renders under `<React.StrictMode>`,
which is the mode that makes a double-fire visible. Separately, `packages/react` declares
`react: >=18` and the suite only ever runs `18.3.x` — while the one place React 19 does run,
`examples/next-app-router`, is where the only React defect this project has ever found was found.
Landing the matrix **before** task 1 means the fix is verified on both majors from its first commit.

**Task 3 finishes what Sprint 1 started.**
[`param-keys.ts`](../../../packages/core/src/param-keys.ts) opens by calling itself "the one place
in the repository that knows how a filter name becomes a URL param key". That is true for
`dateRange` and `numberRange`. For the four scalar kinds, `parse-filters.ts`, `search-params.ts` and
`@filterbridge/next`'s normalizer each still index the input by the filter name directly. Nothing
misbehaves today, because for a scalar the derivation is the identity — but the module's claim is
wider than the code, and the feature that would expose the difference (`text({ key: 'q' })`) is
already on the roadmap and already has its name reserved in
[`filter-types.ts`](../../../packages/core/src/filter-types.ts).

**Task 4 is Sprint 1's lesson applied deliberately.** The two most valuable results of that sprint
came from running code, not from reading it. Task 1 is not finished when its unit tests pass; it is
finished when the `queueMicrotask` workaround is deleted from `examples/next-app-router` and from
the guide, and both the example and the demo have been driven by hand afterwards.

**Task 5** is the two non-code questions that have been open since the release and will keep being
re-asked until someone writes down an answer.

---

## Suggested execution order

```
2                  matrix first, so tasks 1 and 3 are verified on React 18 and 19 from the start
1                  the anchor; depends on nothing, but is worth more with 2 already in place
3                  independent of 1 and 2 — core only, plus one file in next
4                  needs 1 landed; deletes the workaround and drives both surfaces by hand
5                  independent and cheap, do it whenever
6                  closes the sprint
```

Task 2 before task 1 carries one risk worth stating up front: the matrix may surface pre-existing
React 19 failures that then have to be fixed inside this sprint. That is an argument for doing it
first, not against it — discovering them while the hook is being rewritten would make it impossible
to say which change caused what.

---

## Release impact

`0.4.0`, a minor — as argued, and task 1 took option B, so the timing clause was not needed. Argued
in [task 6](./06-release.md); the short version:

- Task 1 removes an observable behavior. `onChange` currently fires **twice** per change under
  `<React.StrictMode>` in development. Nobody wrote code depending on that on purpose, but it is a
  change a user can see.
- Task 3 adds public API to four builders.
- Nothing is removed or renamed, so it is not a major.

Whether task 1 also moves `onChange`'s **timing** depends on which option it takes, and that is the
one decision in this sprint that changes the release argument. See
[task 1, decision 1](./01-onchange-fires-during-render.md#decision-1--where-does-onchange-move-to).

---

## Not in this sprint

Considered and deliberately excluded. All of these stay on [the roadmap](../../roadmap.md).

- **Narrowing `InferFilterState` optionality for defaulted filters.** A `v1.0` item by
  [ADR-002 §5](../../decisions/002-default-values.md), which says it deserves its own release. It is
  a breaking _type_ change, and shipping it in the same version as a hook-timing change hands users
  two unrelated reasons for an upgrade to fail, with one error message pointing at the wrong one.
  The case for doing it keeps getting stronger; the case for doing it _here_ does not exist.
- **`createFilterQueryKey` for TanStack Query.** Roughly thirty lines, and nothing in this
  repository would consume it. The sprint already adds public surface in task 3, and that addition
  closes a gap between a documented invariant and the code. A second addition on speculation is the
  opposite trade — it is new API whose first real user would be the one to discover it is shaped
  wrong. Revisit when the demo or an example actually needs a query key.
- **Active filter chips as a headless helper.** The natural argument for it is that the demo already
  hand-rolls chips. It does not:
  [`ActiveFiltersSummary`](../../../apps/demo/src/components/ActiveFiltersSummary.tsx) is a count
  badge over `activeFilterCount`, so there is nothing to extract, and the task would mean designing
  both the helper and its first consumer from scratch. That is a feature sprint, not a debt sprint.
- **Pagination and sorting helpers.** [CLAUDE.md §12](../../../CLAUDE.md) lists both as out of scope
  and the roadmap records them as "design exploration, not committed". Neither has been asked for.
- **React Router integration.** Open since Wave 6, still not planned.
