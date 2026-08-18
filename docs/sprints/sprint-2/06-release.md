# Task 6 — `0.4.0` release

**Priority:** P2 — closes the sprint
**Area:** all packages
**Status:** planned

---

## The version argument

**Recommended: `0.4.0`, a minor.** Two independent reasons, either of which would be enough:

**Task 3 adds public API.** Four builders gain a `key` option. Additive, but new surface is the
textbook minor.

**Task 1 changes observable behaviour.** Under `<React.StrictMode>` — which is on by default in
`create-next-app` and in Vite's React template — `onChange` currently fires **twice** per state
change and will fire once. Nobody depended on that deliberately, but "your callback runs half as
often" is not a patch note.

If [task 1](./01-onchange-fires-during-render.md) takes option C instead of B, a third reason
appears: `onChange`'s timing moves from synchronous-with-the-action to post-commit. That is
observable by any consumer that reads something `onChange` wrote later in the same handler, and it
would need its own paragraph in the release notes rather than a line in a changeset.

Not a major. Nothing is removed, nothing is renamed, and no type narrows —
[the one change that would](../../decisions/002-default-values.md) is deliberately
[not in this sprint](./README.md#not-in-this-sprint).

## Changesets

Following the grouping Sprint 1 settled on — real changesets for things a user must read, one empty
changeset for the rest:

| Change                                            | Changeset                                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Task 1 — `onChange` no longer fires during render | Real, on `react`. Must spell out the Strict Mode double-fire as a behaviour change, not bury it under "fix" |
| Task 3 — scalar `key` option                      | Real, on `core` and `next`                                                                                  |
| Task 2 — React 19 in the matrix                   | Empty, unless decision 4 narrows a peer range — then real                                                   |
| Tasks 4 and 5 — docs, demo, example               | Empty, grouped                                                                                              |

All five packages are in the `fixed` array in `.changeset/config.json`, so they move together
regardless of which ones the changesets name.

## Release checklist deltas

Three things this sprint should push back into
[`docs/release-checklist.md`](../../release-checklist.md), because each was learned the hard way
rather than read there:

1. **The GitHub Release step, with the web-UI route written out.** `v0.3.1`'s was skipped because
   `gh` was not installed and the checklist offered no alternative — [task 5](./05-repository-housekeeping.md).
2. **Bumping `examples/next-app-router` after publishing.** Its dependencies are pinned to published
   versions, so it is the one thing that necessarily changes _after_ the release, and it is
   therefore the one thing easiest to forget — [task 4](./04-live-surfaces.md).
3. **The Playwright suite in the example**, if task 4 commits one, listed next to `.smoke/` and
   `pnpm demo:a11y` as a manual gate.

## Verification gates

The same table Sprint 1 filled in, which is the point of having it — a release is verified by
running these, not by remembering that they passed last time.

| Check                      | Gate                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm test`                | Green on a clean clone with no build, React 18 **and** React 19                            |
| `pnpm lint`                | Clean                                                                                      |
| `pnpm format:check`        | Clean                                                                                      |
| `pnpm build`               | Dual ESM/CJS + `.d.ts` / `.d.cts`, five packages                                           |
| `pnpm typecheck`           | Clean, after `pnpm build`                                                                  |
| `pnpm pack:all`            | Five tarballs, `workspace:*` resolved to `0.4.0`, no `src/`                                |
| `.smoke/` ESM and CJS      | Green against freshly packed tarballs, after wiping `node_modules` and `package-lock.json` |
| `pnpm demo:a11y`           | Zero violations, real Chromium                                                             |
| `examples/next-app-router` | Builds and runs against the `0.4.0` tarballs, no React warning                             |

`.smoke/` should also gain assertions for whatever task 3 adds to the export surface, the way
Sprint 1's task 2 did — that suite is the only thing testing the published artifact rather than the
source.

## Release notes

`docs/releases/v0.4.0.md`, in the same shape as `v0.3.1.md`: the whole delta from `0.3.1` in one
document, so nobody upgrading has to read two.

The lead should be task 1, framed as what it means rather than what it is. "`onChange` no longer
fires during the render phase" is accurate and tells a reader nothing; "you can navigate from
`onChange` without a warning, and the `queueMicrotask` workaround in the Next.js guide is no longer
needed" is the same fact from the reader's side.

---

## Acceptance criteria

- [ ] Every gate in the table above run and recorded, on this release, not remembered
- [ ] Changesets committed as grouped above — CI reads them from git
- [ ] `pnpm changeset version` run; all five packages at `0.4.0`
- [ ] `docs/releases/v0.4.0.md` written
- [ ] `docs/roadmap.md` updated: a "Shipped in `0.4.0`" section, and the `onChange` and scalar-key
      entries moved out of `0.2.x`
- [ ] `docs/sprints/sprint-2/README.md` gains a closing-health table and per-task outcomes
- [ ] Published, tagged, and the GitHub Release created — for `v0.4.0` and, retroactively, `v0.3.1`
- [ ] `examples/next-app-router` bumped to `0.4.0` and re-run **after** publishing
