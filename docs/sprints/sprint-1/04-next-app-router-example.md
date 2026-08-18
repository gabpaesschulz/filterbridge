# Task 4 — A Next.js App Router example that runs

**Priority:** P2 — the adapter with the most users and the least proof
**Area:** docs, `examples/`
**Status:** done — **and it found two defects, which was the point**

---

## Outcome

[`examples/next-app-router/`](../../../examples/next-app-router) runs, builds, and typechecks
against Next.js `15.5.23`, React `19.2.8` and published FilterBridge `0.2.0`. Option C as
recommended: outside `pnpm-workspace.yaml` (via a `!examples/next-app-router` exclusion), installed
with `npm install`, invisible to the root install and to CI.

Verification was 26 assertions driven through real Chromium — back, forward, back-to-the-start, a
deep link exercising every filter type, and a non-filter param surviving a filter change. All pass.

### The guide was wrong about back/forward, in two independent ways

This is the finding. The guide's known-limitations section said back/forward "triggers a full server
component re-render, which re-parses and re-initializes state correctly". Executing it:

**1. `router.replace` means there is no history to go back to.** The guide navigated with `replace`,
which overwrites the current entry. The app therefore had exactly one history entry, and pressing
Back left the application — the Playwright run landed on `about:blank`. The example uses
`router.push`.

**2. A server re-render does not reach the filter controls.** With `push` in place, Back updated the
URL and the server-rendered rows, and left every filter input where it was. That is correct
behavior from `useFilterBridge`, which captures `initialState` once on purpose
([ADR-002](../../decisions/002-default-values.md)) — but it makes the guide's claim false, and the
resulting half-updated page is worse than either half being wrong alone.

The fix is `usePopstateSync` from `@filterbridge/browser/react`, paired with `syncState` — the pair
[ADR-004](../../decisions/004-external-state-sync.md) introduced for exactly this. A hand-rolled
effect keyed on the server's `initialFilters` was tried first and rejected: it fires one server
round trip after every ordinary change too, and was observed clobbering a search box mid-typing.

### A second defect, in `@filterbridge/react`

Every filter change logged `Cannot update a component (Router) while rendering a different
component`. `useFilterBridge` fires `onChange` from inside its `setState` updater, and React runs
updaters during the render phase.

Pre-existing since `0.1.0`, invisible until now because `apps/demo` writes to `window.history` — not
a React state update — so the impurity never produced a warning.

Written up as [task 6](./06-onchange-fires-during-render.md) and **deferred to Sprint 2**: the fix
moves `onChange` timing, which is the contract 80 hook tests describe, and that is not a decision to
take in the last hour of a release. The example and the guide both carry the one-line
`queueMicrotask` workaround with a pointer to the task.

---

## Problem

`@filterbridge/next` ships with a 220-line guide
([`docs/guides/next-app-router.md`](../../guides/next-app-router.md)) that walks through four steps —
schema, server parse, client state, typed DTO — plus href generation and param preservation. It is a
good guide. Every line of it is a snippet that has never been executed.

The repository has one runnable application, [`apps/demo`](../../../apps/demo), and it is a Vite SPA.
It exercises `core`, `react`, `browser` and `tanstack`. It exercises **nothing** in
`@filterbridge/next`, because there is no Next.js anywhere in the workspace. The package's entire
correctness argument is its unit tests plus prose.

The gap that matters is the server/client boundary. `parseNextSearchParams` runs in a server
component, `useFilterBridge` runs in a client component, and the interesting failure modes —
hydration mismatch, `searchParams` arriving as a Promise in Next 15, back/forward triggering a
server re-render — all live exactly where a unit test does not look. The roadmap asks for
_"[better examples for the Next.js App Router pattern (client + server components)]"_
([roadmap](../../roadmap.md#02x--stability-and-ergonomics)); this is why.

## Decisions needed before implementing

### 1. Runnable app, or better snippets?

| Option                                                      | Trade-off                                                                                                                                                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — a real Next.js app in the workspace                     | Proves the pattern works, and the CI demo job could build it. Adds Next.js, React DOM and a second framework's toolchain to `pnpm install` for everyone, and to every CI leg                        |
| B — a copy-paste example directory, not a workspace package | Matches [`examples/basic`](../../../examples/basic), which is a README of snippets and nothing else. Costs nothing to install. Proves nothing                                                       |
| C — a real app kept **outside** the workspace               | Files live in `examples/next-app-router/` with their own `package.json`, excluded from `pnpm-workspace.yaml`. Runnable by anyone who `cd`s in and installs, invisible to the root install and to CI |

**Recommendation: C.** It is the only option that lets the code be executed at least once by its
author without making every contributor pay for a framework they may not use.
[CLAUDE.md rule 8](../../../CLAUDE.md) says not to add Next.js unless the task asks for it — this
task asks, but only for an example, and keeping it out of the workspace keeps that boundary visible.

Note the consequence and accept it deliberately: an example outside the workspace is not built by
CI, so it can rot. Pin the FilterBridge dependencies to published versions rather than
`workspace:*`, and state in its README which version it was verified against.

### 2. Which Next.js version?

15+, where `searchParams` is a Promise and `parseNextSearchParamsAsync` is the function that
matters. That is the version a reader starting today will install, and the async variant is the part
of the API most likely to be used wrong. Say the version in the README and in the guide.

### 3. What does the example actually show?

Keep it to the boundary, not to a second demo app. The minimum that would have caught a real bug:

- a server component that parses `searchParams` and fetches with the DTO;
- a client component with `useFilterBridge` that navigates via `router.replace(href)`;
- back/forward working, which is the case the guide's
  [known limitations](../../guides/next-app-router.md#known-limitations) describes as "a full server
  component re-render which re-initializes state correctly" — a claim currently backed by reasoning
  alone;
- a filter with a `default`, so the interaction between defaults and an empty query string is
  visible on the server side, where [ADR-002](../../decisions/002-default-values.md)'s
  URL-omits-but-DTO-carries rule is easiest to get wrong.

No styling beyond the minimum. No table. This is an example, not a demo.

### 4. What happens to the guide?

The guide stays and gains a link to the example. The snippets in it should be replaced with the
ones from the running app so the two cannot drift — copy from the app into the guide, not the
reverse.

## Acceptance criteria

- [x] `examples/next-app-router/` runs against a published FilterBridge version, verified by
      actually starting it
- [x] It is excluded from `pnpm-workspace.yaml` and does not affect the root `pnpm install`
- [x] Its README states the Next.js version, the FilterBridge version, and the install command
- [x] Back/forward is verified — by Playwright rather than by hand, 26 assertions. It did **not**
      work as the guide claimed; both causes are in the Outcome above, and the library defect the
      run exposed is [task 6](./06-onchange-fires-during-render.md)
- [x] The guide's snippets match the example's code
- [x] The guide links to the example, and the example links back to the guide
- [x] Roadmap item checked off

## Risk

Low for the repository, since nothing published changes and CI does not see the new directory.

The real risk is that building it surfaces a bug in `@filterbridge/next` — a hydration mismatch, or
`parseNextSearchParamsAsync` being awkward in practice. That is the point of the task. If it
happens, stop, write it up as a new task, and decide whether it lands in this sprint or the next.

## Related

- [`docs/api/next.md`](../../api/next.md) — the API this exercises
- [ADR-002 — default values](../../decisions/002-default-values.md) — the rule the server side
  makes visible
