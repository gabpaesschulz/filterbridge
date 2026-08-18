# Task 5 — Two open repository questions

**Priority:** P3 — neither blocks anything, and both will keep being re-asked until they are decided
**Area:** repository
**Status:** planned

---

## Question 1 — is `CLAUDE.md` supposed to be untracked?

**Current state, verified:** `.gitignore:14` contains `CLAUDE.md`, and `git ls-files CLAUDE.md`
returns nothing. The file exists only on the maintainer's machine.

That is a real consequence, not a theoretical one. `CLAUDE.md` is the file that says what
`@filterbridge/core` exports, what each filter type does, which builder names are current
(`boolean`, not `booleanFilter`), the wave and sprint history, and the fifteen behaviour rules in
§22. Every sprint edits it. None of those edits are in the repository, none are reviewable, and none
survive a fresh clone — so a second contributor, or the maintainer on a different machine, works
from a version of the project's own instructions that does not exist for them.

It is also linked from tracked documentation. `docs/sprints/sprint-1/02-custom-range-keys.md`,
`docs/roadmap.md` and the files in this sprint all reference `CLAUDE.md` by relative path, and every
one of those links is broken on GitHub today.

| Option                                                        | Trade-off                                                                                                                                                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — track it**                                              | The instructions become reviewable, diffable, and present in a clone. It also becomes public: §21 ("portfolio angle") and the resume/LinkedIn copy in it are visible to anyone reading the repository |
| B — keep it ignored, and stop linking to it from tracked docs | Honest, and it means every cross-reference in three sprints has to be rewritten or dropped                                                                                                            |
| C — track a trimmed version, keep the private part elsewhere  | Gets the technical contract into the repository and the self-presentation notes out of it. Costs a split that has to be maintained                                                                    |

**Recommended: A, with §21 moved out.** The technical content — the export list, the filter
semantics, the naming corrections, the behaviour rules — is project documentation, it is already
being cited by tracked files, and there is nothing embarrassing in it. §21 is the only part that
reads as private notes rather than as documentation; moving it to `docs/marketing/` (already
gitignored, and already used for exactly this) costs one commit and removes the only real objection
to tracking the rest.

Whichever way this goes, the `.gitignore` line should end up with a comment explaining the choice —
the file already does this for `.smoke/`, and that comment is the reason nobody has re-broken it.

---

## Question 2 — the `v0.3.1` GitHub Release was never created

**Current state, verified:** the tag `v0.3.1` exists on the remote,
[`docs/releases/v0.3.1.md`](../../releases/v0.3.1.md) is written and is the whole delta from
`0.2.0`, and `gh` is not installed on the maintainer's machine — which is why the step was skipped.

The packages are on npm, so nothing is broken for users. What is missing is the GitHub Releases page
entry, which is where the repository's own README and the roadmap point people for "what shipped".
A tag with no release renders as a bare tag.

| Option                                            | Trade-off                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **A — create it through the GitHub web UI**       | No tooling to install, takes about two minutes: New release → existing tag `v0.3.1` → paste `docs/releases/v0.3.1.md`        |
| B — install `gh` and script it                    | Pays off from the second release onward, and turns a two-minute task into a tooling task inside a sprint that has other work |
| C — a GitHub Actions release workflow on tag push | The durable answer, and it is a real piece of work: permissions, changelog source, and a dry run                             |

**Recommended: A now, C filed on the roadmap.** `0.4.0` closes this sprint, so the same manual step
is about to be needed again — which is the argument for C eventually and the argument against
building it in the middle of this sprint. Do `v0.3.1` and `v0.4.0` by hand, and let the third
repetition justify the automation.

Whichever is chosen, [`docs/release-checklist.md`](../../release-checklist.md) should name the step
explicitly, with the web-UI route written out. It was skipped because it was blocked by a missing
tool, and the checklist did not offer the route that was not blocked.

---

## Acceptance criteria

- [ ] A decision recorded on `CLAUDE.md`, and the `.gitignore` line carrying a comment stating it
- [ ] If tracked: every relative link to `CLAUDE.md` in `docs/` resolves on GitHub
- [ ] The `v0.3.1` GitHub Release exists, with `docs/releases/v0.3.1.md` as its body
- [ ] `docs/release-checklist.md` names the GitHub Release step and the non-`gh` route to it
- [ ] Automating releases filed on the roadmap under Housekeeping, which is currently empty

---

## Related

- [`docs/release-checklist.md`](../../release-checklist.md)
- [Task 6](./06-release.md) — which will need the same manual step for `0.4.0`
