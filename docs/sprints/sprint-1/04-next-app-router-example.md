# Task 4 — A Next.js App Router example that runs

**Priority:** P2 — the adapter with the most users and the least proof
**Area:** docs, `examples/`
**Status:** open

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

- [ ] `examples/next-app-router/` runs against a published FilterBridge version, verified by
      actually starting it
- [ ] It is excluded from `pnpm-workspace.yaml` and does not affect the root `pnpm install`
- [ ] Its README states the Next.js version, the FilterBridge version, and the install command
- [ ] Back/forward is verified by hand and the result recorded — if it does not work as the guide
      claims, that is a defect and gets its own task, not a footnote here
- [ ] The guide's snippets match the example's code
- [ ] The guide links to the example, and the example links back to the guide
- [ ] Roadmap item checked off

## Risk

Low for the repository, since nothing published changes and CI does not see the new directory.

The real risk is that building it surfaces a bug in `@filterbridge/next` — a hydration mismatch, or
`parseNextSearchParamsAsync` being awkward in practice. That is the point of the task. If it
happens, stop, write it up as a new task, and decide whether it lands in this sprint or the next.

## Related

- [`docs/api/next.md`](../../api/next.md) — the API this exercises
- [ADR-002 — default values](../../decisions/002-default-values.md) — the rule the server side
  makes visible
