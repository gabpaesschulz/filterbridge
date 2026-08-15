# Task 9 — No CI workflow

**Priority:** P2 — infrastructure gap
**Area:** repository infrastructure
**Status:** done — with two defects found afterwards

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record). The workflow shipped, but as written here it could never
> have gone green: `dist/` is gitignored and `typecheck`/`test` ran before `build`. The
> "pre-flight verification done locally" below was true only on a machine that already had
> `dist/` from earlier builds. Fixed by moving `build` first. CI is green now — Node 18/20/22
> on Linux, Node 20 on Windows.

---

## Problem

The repository has `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md`, but no
`.github/workflows/` directory. Nothing runs on push or pull request.

Five packages are published to npm from a repository where no automated check has ever run. Every
`pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` invocation so far has been manual, on
one machine, on Windows.

## Why it matters

- **The acceptance checklist assumes it.** CLAUDE.md §23 requires `pnpm install` from a clean
  clone, `pnpm build`, and `pnpm test` to pass — and "no implementation that only works in one
  local machine" (§13). Nothing currently verifies any of that. The lockfile, the `workspace:*`
  resolution, and the tsup builds have only ever been exercised in one environment.
- **This sprint makes it urgent.** Tasks 1–4 rewrite the core parsing and serialization paths, and
  tasks 5–7 change public API. That is the wrong moment to have no safety net.
- **It is the most visible gap for a portfolio project.** A published TypeScript library with 299
  tests and no green badge reads as untested to anyone who checks — and checking the Actions tab is
  the first thing an experienced reviewer does.
- **Platform coverage is genuinely absent.** The project has only ever been built and tested on
  Windows. Most consumers are on Linux or macOS, and path handling is a real source of
  cross-platform bugs in build tooling.

## Proposed fix

One workflow, `.github/workflows/ci.yml`, on `push` to `main` and on `pull_request`:

```
checkout → setup pnpm → setup node (cache: pnpm) → install --frozen-lockfile
  → lint → typecheck → test → build
```

Notes on the specifics:

- **`--frozen-lockfile`** is the point of the install step, not an optimization. It is what catches
  a `pnpm-lock.yaml` that drifted from the manifests.
- **Build must run after test**, and must not be skipped. tsup emitting `.d.ts` and `.d.cts` is
  part of the published contract and is not covered by any test.
- **Node versions:** `engines` declares `>=18`, so test on 18 and 20 at minimum. If that claim is
  not actually true, the fix is to correct `engines`, not to drop the matrix.
- **OS matrix:** at least `ubuntu-latest`. Adding `windows-latest` keeps the one environment that
  has been verified so far honest.
- **Concurrency group** cancelling superseded runs on the same ref, so a branch with rapid pushes
  does not queue.

Optionally in the same pass, or deferred:

- A `changeset` check on PRs, verifying that changes to `packages/**` carry a changeset —
  `@changesets/cli` is already a dev dependency and `.changeset/config.json` is configured.
- Building `apps/demo` in CI, so a demo break is caught before deploy rather than by Vercel.

## Acceptance criteria

- [x] `.github/workflows/ci.yml` exists and runs on push to `main` and on pull requests
- [x] Runs install (frozen lockfile), lint, typecheck, test, and build
- [ ] Passes on Linux — the first run is a genuine test of the "clean clone" claim
- [x] Node matrix covers the range declared in `engines`, or `engines` is corrected to match
- [x] A deliberately failing test fails the workflow (verify the checks are actually wired up, not
      silently skipped)
- [x] Status badge added to [`README.md`](../../../README.md)
- [x] [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) mentions that CI runs these checks

The Linux box stays unchecked until the workflow has actually run on GitHub — it cannot be verified
from the local machine.

## What was implemented

Three jobs in `.github/workflows/ci.yml`, on `push` to `main` and on `pull_request`, under a
concurrency group that cancels superseded runs on the same ref:

| Job          | Matrix                                                           | Steps                                     |
| ------------ | ---------------------------------------------------------------- | ----------------------------------------- |
| `check`      | `ubuntu-latest` × Node 18/20/22, plus `windows-latest` × Node 20 | install → lint → typecheck → test → build |
| `demo build` | `ubuntu-latest` × Node 20                                        | install → build → `demo:build`            |
| `changeset`  | `ubuntu-latest` × Node 20, pull requests only                    | `changeset status --since=origin/<base>`  |

Supporting changes:

- Added `packageManager: "pnpm@10.14.0"` to the root `package.json`. `pnpm/action-setup@v4` reads
  the pnpm version from that field, so CI and local development cannot drift apart.
- `demo build` is a separate job because the demo resolves `@filterbridge/*` through each package's
  `dist/` output, so it needs `pnpm build` first — running it inside the `check` matrix would repeat
  that work four times for one signal.
- The `changeset` job fetches the base branch explicitly; `actions/checkout` does not guarantee
  `origin/<base>` exists for a pull request even at `fetch-depth: 0`.
- `engines.node` was left at `>=18.0.0` and the matrix covers 18. No source uses an API newer than
  Node 18 (checked for `URL.canParse`, `Object.groupBy`, `toSorted`, `findLast`, `structuredClone`).

### Pre-flight verification done locally

- `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test` (450 tests), `build`, and
  `demo:build` all pass.
- Each check was confirmed to actually fail when broken, so a red run is a real signal rather than a
  silently skipped step: a planted failing test exits `1`, a type error exits `2`, an `any` violation
  exits `1`, and a broken entry import fails the build with `1`.
- All relative imports across `packages/`, `apps/`, and `scripts/` were verified to resolve with
  exact casing, which is the failure mode Windows hides from a Linux runner.

## Deliberately not included

`pnpm format:check` is not a CI step. It currently fails on 69 files, and wiring it up would make
the first run red for formatting rather than for correctness. Reformatting the repository is its own
change — see [task 10](./10-regression-tests-and-release.md).

## Risk

None to published code. The realistic outcome is that the first run **fails** — on a lockfile
mismatch, a peer dependency warning treated as an error, or a case-sensitive import path that
Windows tolerated. That is the task working as intended; budget time for the fallout rather than
expecting a green first run.

The pre-flight checks above cover the failure modes that can be reproduced locally, but they cannot
substitute for the first real run: the lockfile has only ever been resolved on Windows, and Node 18
has never been exercised at all.

## Related

- [Task 10 — regression tests and release](./10-regression-tests-and-release.md) — CI should be
  green before publishing `0.1.1`
