# Task 4 — Re-run the live surfaces

**Priority:** P2 — but it is the task that decides whether task 1 actually worked
**Area:** `apps/demo`, `examples/next-app-router`, docs
**Status:** planned
**Depends on:** [task 1](./01-onchange-fires-during-render.md) landing first

---

## Why this is a task and not a checkbox

Sprint 1's most valuable output did not come from reading code. It came from building
`examples/next-app-router` and running it, which corrected two false claims in the Next.js guide and
surfaced [the defect this sprint is built around](../sprint-1/06-onchange-fires-during-render.md).
Unit tests would not have found any of the three: they exercise the hook, and all three lived in the
seam between the hook and a real router.

Task 1 will end with green unit tests and a fix that has never been run inside a real Next.js app.
This task is the part that closes that gap, and it is written up separately so it cannot quietly
become "and then I ran the demo once".

## What has to happen

**1. Delete the `queueMicrotask` workaround.** It currently lives in four places:

| Location                                            | What it is                                              |
| --------------------------------------------------- | ------------------------------------------------------- |
| `examples/next-app-router/app/invoices-client.tsx`  | The wrapper, with a comment saying it can go once fixed |
| `examples/next-app-router/README.md`                | Explains why the wrapper is there                       |
| `docs/guides/next-app-router.md`                    | Tells every reader to write it                          |
| `docs/releases/v0.3.1.md`, `docs/sprints/sprint-1/` | **Leave these.** They are records of what was true then |

The last row matters. Sprint records and shipped release notes are history, and editing them to
match the present is how a repository loses the ability to say when something changed.

**2. Drive both surfaces by hand.** The demo (`pnpm demo`) and the example (`npm run dev`). Filter,
back, forward, reload, filter again. Specifically: no `Cannot update a component while rendering a
different component` warning in the console, and back/forward still lands where
[the guide](../../guides/next-app-router.md) says it does after the corrections Sprint 1 made.

**3. `pnpm demo:a11y`.** Nothing in this sprint changes demo colours, so this should be a no-op — run
it anyway, because it is cheap and because "should be" is how a regression gets shipped.

---

## The ordering problem

`examples/next-app-router` pins **published** versions:

```json
"@filterbridge/react": "^0.3.1"
```

That was a deliberate choice ([Sprint 1 task 4](../sprint-1/04-next-app-router-example.md),
decision: pin rather than `workspace:*`, so the example stays outside the pnpm workspace and off
every contributor's install). The consequence for this sprint is that **the example cannot see task
1's fix until it is published**, which would put the only real verification after the release.

Options, and this needs deciding before task 1 starts:

| Option                                                           | Trade-off                                                                                                                                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — install from `.packs/` tarballs for the verification run** | `pnpm pack:all` already exists and `.smoke/` already installs tarballs by `file:` reference. Verify against the exact artifact that will publish, then restore the pinned versions before committing |
| B — temporarily point the example at `workspace:*`               | Simplest to type, and it is a one-line diff that is very easy to commit by accident. It also does not test the packed artifact, only the source                                                      |
| C — publish `0.4.0`, then verify                                 | Honest ordering in one sense and backwards in every other: the release becomes the experiment                                                                                                        |
| D — `npm link` / `pnpm link`                                     | Works, and its resolution behaviour differs enough from a real install that a link-only success proves less than it appears to                                                                       |

**Recommended: A.** It is the same mechanism `.smoke/` already uses, it tests the artifact rather
than the source, and the restore step is a `git checkout` of two files. Add a note to
[`docs/release-checklist.md`](../../release-checklist.md) so the next person does not rediscover
this: `npm install` in a tarball-consuming directory reuses its cache when the version has not
changed, so the wipe already documented for `.smoke/` applies here too.

## The uncommitted Playwright suite

Sprint 1 records 26 Playwright assertions proving back/forward works in the example. There is no
test file, no Playwright config and no `test` script in `examples/next-app-router` — the run
happened and left nothing behind. So the evidence for the example's central claim is a sentence in a
sprint document.

**Recommendation: commit it this time**, as part of this task. Someone is going to drive the example
by hand anyway; writing the same assertions into `examples/next-app-router/e2e/` costs little more
and turns a one-time result into something re-runnable. Two decisions come with it:

- **Does it run in CI?** _Recommended: no._ The example is deliberately outside the workspace and
  outside CI, and adding a Next.js build plus a browser download to every pull request undoes the
  reason it was excluded. Document it as a manual gate in the release checklist, next to `.smoke/`
  and `pnpm demo:a11y` — which are also manual, also documented, and have not rotted.
- **What does it assert?** _Recommended:_ the back/forward behaviour Sprint 1 corrected the guide
  about, plus one assertion that the console produced no React warning during a filter change. The
  second is the one that would have caught task 1's defect, and it is the reason to write the suite
  at all.

---

## Acceptance criteria

- [ ] `queueMicrotask` gone from `examples/next-app-router/app/invoices-client.tsx`, its README, and
      `docs/guides/next-app-router.md` — and still present in the sprint-1 and `v0.3.1` records
- [ ] The example runs against the packed `0.4.0` tarballs with no React warning in the console on a
      filter change, and its pinned versions are restored before commit
- [ ] Back and forward verified by hand in both the demo and the example
- [ ] `pnpm demo:a11y` clean
- [ ] A committed, re-runnable Playwright suite in `examples/next-app-router`, documented as a
      manual gate
- [ ] The example's pinned versions bumped to `0.4.0` after publishing — this is the one step that
      necessarily happens after the release, and it belongs in [task 6](./06-release.md)
- [ ] An empty changeset (`pnpm changeset add --empty`) covering the demo and docs changes

---

## Related

- [Task 1](./01-onchange-fires-during-render.md) — what is being verified
- [Sprint 1 task 4](../sprint-1/04-next-app-router-example.md) — why the example is pinned and
  outside the workspace
- [`docs/release-checklist.md`](../../release-checklist.md) — where the manual gates are listed
