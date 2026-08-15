# Task 1 — Formatting pass and `format:check` in CI

**Priority:** P1 — blocks every other diff in the sprint
**Area:** infrastructure
**Status:** open

---

## Problem

`pnpm format:check` fails on a clean checkout:

```txt
[warn] Code style issues found in 122 files. Run Prettier with --write to fix.
```

Prettier is configured ([`.prettierrc`](../../../.prettierrc)), wired to `pnpm format` /
`pnpm format:check`, and never enforced. CI runs lint, typecheck, test and a demo build
([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)) but not formatting, so the drift
grows on every commit.

[`docs/roadmap.md`](../../roadmap.md#pnpm-formatcheck-is-not-a-ci-step) records this as
housekeeping and puts the number at 69. It is 122 today: **68 code files and 54 Markdown files**.
The roadmap figure was the code-file count when Sprint 0 measured it, so it was never counting the
same thing — correcting that line is part of this task.

## Why it is worth doing now

Not because unformatted code is broken. Because every other task in this sprint edits files that sit
in those 122, and a reviewer reading task 2's diff should see a parsing change, not a re-indented
file that happened to be touched.

The reason it was deferred in Sprint 0 still holds and is the reason it goes first here: wiring
`format:check` into CI before reformatting makes every run red for whitespace.

## Decisions needed before implementing

### 1. Does Prettier own the Markdown?

54 of the 122 files are Markdown, most of them under `docs/`. Prettier's default
`proseWrap: "preserve"` will not reflow paragraphs, but it does normalize list markers, emphasis
characters and — the one that matters here — table column padding. The hand-aligned tables in
[`docs/sprints/`](../) and the ADRs will be rewritten.

| Option                              | Trade-off                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — format Markdown too             | One rule for the repository, no "which files does this apply to" question. Rewrites every table in `docs/`, and the diff is large enough to hide a content change |
| B — add `*.md` to `.prettierignore` | Docs stay hand-formatted, and the code pass drops to 68 files. But "formatted" now means two things depending on the extension, and nothing checks the docs       |

**Recommendation: A.** The repository already treats docs as a first-class deliverable; excluding
them from the only mechanical check it has is the wrong asymmetry. The "hides a content change"
risk is real and is answered by decision 3, not by an ignore rule.

### 2. Is `printWidth: 100` right for prose?

`.prettierrc` sets `printWidth: 100`, which the docs already follow by hand. With
`proseWrap: "preserve"` the setting does not touch prose at all, so this is a no-op — but confirm it
rather than discover it in the diff. If the pass turns out to rewrap paragraphs, stop and set
`proseWrap: "preserve"` explicitly instead of loosening the width.

### 3. One commit or two?

The formatting pass must be its own commit, containing nothing but `pnpm format` output, so that
`git log -p` on any file can skip it and `git blame` can be taught to. Add
[`.git-blame-ignore-revs`](https://git-scm.com/docs/git-blame#Documentation/git-blame.txt---ignore-revs-fileltfilegt)
with that commit's hash in the follow-up commit, and mention it in
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — a blame-ignore file that nobody knows to enable
locally (`git config blame.ignoreRevsFile .git-blame-ignore-revs`) helps nobody.

### 4. Where does the CI step go?

Before `Lint`, in the same `check` job, and **not** in the matrix — formatting is
platform-independent, so running it on four matrix legs buys nothing. Either give it its own small
job or guard it with an `if` on one leg. Prefer a separate `format` job: a red X labelled
`format` is self-explanatory in a way that a red `ubuntu-latest · node 18` is not.

## Acceptance criteria

- [ ] `pnpm format:check` exits 0 on a clean checkout
- [ ] The formatting pass is a single commit with no manual edits mixed in
- [ ] `.git-blame-ignore-revs` exists, contains that commit, and is documented in `CONTRIBUTING.md`
- [ ] CI fails a pull request that introduces unformatted files, and the failing job is named for
      formatting
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm build` still pass — a formatting pass
      that changes behavior means a Prettier setting is wrong, not that the code was wrong
- [ ] The roadmap's housekeeping entry is removed, not just checked off, and the stale "69 files"
      figure goes with it

## Risk

Low, with one sharp edge: `.prettierignore` currently excludes `*.cjs`, which covers
[`.eslintrc.cjs`](../../../.eslintrc.cjs) and any CJS build output that escapes `dist/`. Leave that
line alone. Reformatting a generated or config file that a tool parses positionally is the only way
this task can break something.

Verify the pass touched no `dist/`, `node_modules/`, `.packs/` or `.smoke/` path before committing —
`.prettierignore` covers the first two, the other two are gitignored, and a stray `--write` outside
the repository root is the failure mode to rule out.

## Related

- [Task 5 — release](./05-release.md) — this task needs an empty changeset; it changes no package
  behavior
- [Sprint 0 task 9 — CI workflow](../sprint-0/09-ci-workflow.md) — the workflow this extends
