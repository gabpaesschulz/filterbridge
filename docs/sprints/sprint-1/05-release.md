# Task 5 — `0.3.0` release (shipped as `0.3.1`)

**Priority:** P2 — closes the sprint
**Area:** all packages
**Status:** done. Released as **`0.3.1`** — see the note below. **Not published**; the `npm publish`
step is the maintainer's to run.

---

## Outcome

A minor, as recommended — task 2 landed, so the argument held: new API surface in two builders, four
new exports in `core`, and behavior changes.

**The published number is `0.3.1`, not `0.3.0`.** `0.3.0` was cut, and then a schema-validation pass
landed before anything reached npm: four more definition-time throws, plus a clearer message for a
range colliding with itself. That arrived as a `patch` changeset on top of an unpublished version,
so `changeset version` produced `0.3.1`. Each package's `CHANGELOG.md` has two sections where the
registry will show one release; `docs/releases/v0.3.1.md` is the whole delta from `0.2.0`, so nobody
upgrading reads two documents.

All five packages moved `0.2.0` → `0.3.0` via `pnpm changeset version`. Two changesets went in: the
non-empty one for custom range keys, which spells out the collision throw as a behavior change
rather than burying it, and one empty changeset covering formatting, demo contrast and the Next.js
example together — grouped rather than filed as three, following the existing
`.changeset/goofy-goats-tease.md` precedent.

### Verified

| Check                   | Result                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| `pnpm test`             | 581 passing / 29 files, clean clone, no build                         |
| `pnpm lint`             | clean                                                                 |
| `pnpm typecheck`        | clean, 5 packages, after `pnpm build`                                 |
| `pnpm format:check`     | clean — new to this release                                           |
| `pnpm build`            | dual ESM/CJS + `.d.ts` / `.d.cts`, all five                           |
| `pnpm pack:all`         | five tarballs; `workspace:*` resolved to `0.3.1`; no `src/`, no tests |
| `@filterbridge/browser` | both entry points in the tarball — `dist/index.*` and `dist/react.*`  |
| `.smoke/` ESM           | 66 assertions passing against the packed tarballs                     |
| `.smoke/` CJS           | 50 assertions passing                                                 |
| `pnpm demo:a11y`        | zero violations, real Chromium                                        |
| Next.js example         | 26 Playwright assertions, `npm run build` clean                       |

### What the release surfaced about the process

Three things went back into [`docs/release-checklist.md`](../../release-checklist.md) rather than
staying in this file:

1. **`.smoke/` reinstalls need a wipe.** `npm install` resolves `file:` dependencies from cache by
   name and version, so re-running it over a rebuilt tarball of the _same_ version silently
   reinstalls the old code — and the smoke suite passes against it. The checklist already said this;
   this release confirmed it the hard way by skipping the step.
2. **Smoke assertions can encode a proxy rather than a rule.** One had to change:
   `dateRange.length === 0`, arity standing in for ADR-002's "these builders take no configuration".
   The rule still holds; the proxy stopped tracking it. It now asserts the rule.
3. **The Next.js example needs a post-publish bump.** It is pinned to a published range and lives
   outside the workspace, so nothing in CI will notice it going stale.

### Deliberately not done

**`npm publish` was not run.** Everything up to it is done and verified; pushing five packages to a
public registry is not a step to take unasked. To publish:

```bash
npm whoami                # confirm the account
pnpm changeset publish    # or the per-package commands in the checklist
git tag v0.3.1 && git push --tags
```

Then work the post-publish section of the checklist — GitHub Release body from
[`docs/releases/v0.3.1.md`](../../releases/v0.3.1.md), and the example bump.

### Regression check

Run, as this task asked, and against the code rather than against these files. It is what produced
[task 6](./06-onchange-fires-during-render.md): `useFilterBridge` fires `onChange` from inside its
`setState` updater. Shipping unfixed, with the reasoning and the workaround in that file and in the
release notes.

---

## Problem

Nothing is wrong here. This task exists because the sprint's changes have to reach npm, and because
the version number is a decision that should be made once, deliberately, rather than argued about
while a release is half-published.

## Decision — patch or minor?

`.changeset/config.json` puts all five packages in one `fixed` group, so every publish moves all
five to the same version whether or not their code changed. The question is only which number.

| Option  | Argument                                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0.2.1` | Only one task changes package code, and it is additive. The roadmap files custom range keys under `0.2.x — Stability and ergonomics`                                                                                      |
| `0.3.0` | [Task 2](./02-custom-range-keys.md) adds a public option to two builders, moves key derivation into core, and makes a previously-silent schema collision throw. That last part changes behavior for code that works today |

**Recommendation: `0.3.0`.** In `0.x`, minor is the conventional signal for "new API surface", and
task 2 is new API surface plus one behavior change. The roadmap heading is not a constraint — it was
written before the collision decision existed.

If task 2 slips out of the sprint, this becomes `0.2.1` and the release is documentation and demo
polish only. Decide at the point task 2 lands, not before.

## What the release covers

| Task                                                   | Changeset                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [1 — formatting](./01-formatting-and-format-check.md)  | empty — no package behavior changed                                                    |
| [2 — custom range keys](./02-custom-range-keys.md)     | **minor**, and it must spell out the collision throw as a behavior change, not bury it |
| [3 — demo contrast](./03-demo-contrast.md)             | empty — `@filterbridge/demo` is never published                                        |
| [4 — Next.js example](./04-next-app-router-example.md) | empty — docs and an out-of-workspace example                                           |

Three empty changesets is not a smell here; CI's changeset check fires on any workspace package
edit, including the demo, and the existing
[`.changeset/goofy-goats-tease.md`](../../../.changeset/goofy-goats-tease.md) already documents that
pattern. Group them rather than filing four separate empty files where one covers the batch.

## Before publishing

Work through [`docs/release-checklist.md`](../../release-checklist.md) — it is the live procedure and
this file does not restate it. The items worth flagging for **this** release specifically:

- [x] `pnpm test` green on a clean clone with no build, per
      [ADR-003](../../decisions/003-test-resolution.md)
- [x] `pnpm format:check` green — new to this release, and the reason task 1 exists
- [x] `pnpm pack:all` then the `.smoke/` ESM and CJS assertions, extended for the `keys` option
- [x] Release notes drafted in `docs/releases/v0.3.1.md`, following
      [`v0.2.0.md`](../../releases/v0.2.0.md)
- [x] Roadmap updated: the two housekeeping entries deleted, the custom-keys item moved into a
      "Shipped in `0.3.0`" section
- [x] `CLAUDE.md` §5, §6 and §18b updated if task 2 changed the exported surface
- [x] This sprint's task files marked done, and this README given a `Closed:` date

## Regression check

Sprint 0 closed with a code review that found four items the ten planned tasks had missed, two of
them P0, [recorded in its README](../sprint-0/README.md#found-by-the-closing-code-review-after-tasks-110).
That review is the reason those bugs did not ship. Run one here too, before publishing, and review
the code against the code — not against these task files, which is precisely the mistake that let a
stale `dist/` hide a broken test last time.

## Risk

Low, provided task 2's "existing 538 tests pass unmodified" criterion actually held. If any test was
edited to accommodate the refactor, that is the thing to re-examine before publishing, not after.

## Related

- [`docs/release-checklist.md`](../../release-checklist.md) — the procedure
- [Sprint 0 task 10](../sprint-0/10-regression-tests-and-release.md) — the equivalent task last time
