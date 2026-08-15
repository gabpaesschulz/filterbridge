# Task 5 — `0.3.0` release

**Priority:** P2 — closes the sprint
**Area:** all packages
**Status:** open

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

- [ ] `pnpm test` green on a clean clone with no build, per
      [ADR-003](../../decisions/003-test-resolution.md)
- [ ] `pnpm format:check` green — new to this release, and the reason task 1 exists
- [ ] `pnpm pack:all` then the `.smoke/` ESM and CJS assertions, extended for the `keys` option
- [ ] Release notes drafted in `docs/releases/v0.3.0.md`, following
      [`v0.2.0.md`](../../releases/v0.2.0.md)
- [ ] Roadmap updated: the two housekeeping entries deleted, the custom-keys item moved into a
      "Shipped in `0.3.0`" section
- [ ] `CLAUDE.md` §5, §6 and §18b updated if task 2 changed the exported surface
- [ ] This sprint's task files marked done, and this README given a `Closed:` date

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
