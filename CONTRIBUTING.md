# Contributing to FilterBridge

Thanks for your interest in contributing. FilterBridge is a small, focused library and contributions are welcome.

---

## Project overview

FilterBridge is a TypeScript-first filter schema library for React admin screens. It consists of five publishable npm packages in a pnpm monorepo:

| Package                  | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `@filterbridge/core`     | Schema DSL, parsing, URL serialization, backend DTO |
| `@filterbridge/react`    | `useFilterBridge` React hook                        |
| `@filterbridge/browser`  | Browser URL sync helpers                            |
| `@filterbridge/tanstack` | TanStack Table adapter                              |
| `@filterbridge/next`     | Next.js App Router adapter                          |

The project aims to be small, well-tested, and easy to explain. Contributions that add scope creep or unnecessary dependencies will be declined.

---

## Requirements

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Git

---

## Setup

```bash
git clone https://github.com/gabpaesschulz/filterbridge.git
cd filterbridge
pnpm install
```

---

## Common commands

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# TypeScript check across all packages
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Run the demo app at http://localhost:5173
pnpm demo

# Build the demo for static hosting
pnpm demo:build

# Pack all packages to .packs/ (for local inspection)
pnpm pack:all
```

---

## Repository structure

```
filterbridge/
  apps/
    demo/              — Vite + React demo app (not published)
  packages/
    core/              — @filterbridge/core
    react/             — @filterbridge/react
    browser/           — @filterbridge/browser
    tanstack/          — @filterbridge/tanstack
    next/              — @filterbridge/next
  docs/
    api/               — API reference docs
    guides/            — Usage guides
    concepts/          — Architecture and non-goals
    decisions/         — Architecture decision records (ADRs)
    releases/          — Release notes
    sprints/           — Per-sprint process records
  examples/            — Copy-paste snippets (not a workspace package)
  scripts/             — Workspace scripts (pack-all, etc.)
  .changeset/          — Changesets awaiting release
  .github/             — Issue templates, PR template, CI workflow
  package.json         — Workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  vitest.workspace.ts  — the project list (vitest.config.ts is empty by design)
  vitest.aliases.ts    — resolves @filterbridge/* to source in tests
```

---

## Running tests

Tests use [Vitest](https://vitest.dev/).

```bash
# Run all tests
pnpm test

# Run tests for one package
pnpm --filter @filterbridge/core test
pnpm --filter @filterbridge/react test
```

Test files live in `src/__tests__/` (core, react, tanstack, next) or `src/tests/` (browser). Follow
whichever the package you are touching already uses.

---

## Writing tests

Every behavior change should have a corresponding test. The project aims to keep core logic heavily tested.

Guidelines:

- Test parsing, serialization, and DTO generation for each filter type.
- Test edge cases: empty input, invalid values, partial range objects.
- For React hook tests, use `@testing-library/react`.
- Avoid testing internal implementation details — test observable behavior.

---

## Adding a new filter type

New filter types require changes in several files across `@filterbridge/core`:

1. Add the filter interface to `src/filter-types.ts`
2. Add the builder function to `src/filter-builders.ts`
3. Update `src/infer.ts` to include the new type in `InferFilterState`
4. Update `src/parse-filters.ts` to handle the new type
5. Update `src/search-params.ts` to serialize the new type
6. Update `src/query-dto.ts` to handle DTO conversion
7. Update `src/filter-validation.ts` if the type validates its values, and `src/defaults.ts` if it
   accepts a `{ default }` — both hold one rule shared by parsing and both serializers, so a type
   handled in only one of them will drift. See [ADR-002](docs/decisions/002-default-values.md) for
   which types may accept a default and [ADR-005](docs/decisions/005-serialization-validation.md)
   for the validation contract.
8. Export from `src/index.ts`
9. Add tests
10. Update `packages/core/README.md`
11. Update `docs/api/core.md`

Propose new filter types via an issue first.

---

## Adding a new package

New adapters belong in `packages/<name>/` as `@filterbridge/<name>`.

Before starting:

- Open an issue describing the use case.
- Confirm there is no existing package or simple workaround.
- Discuss the API shape before implementing.

A new package needs:

- `package.json` with correct metadata (`author`, `repository`, `bugs`, `homepage`, `sideEffects: false`, `files`, `exports`)
- `tsup.config.ts` for ESM + CJS build
- `tsconfig.json` extending `../../tsconfig.base.json`
- `vitest.config.ts`
- Source files in `src/`
- `src/index.ts` as the public entry point
- `README.md`
- Tests
- `docs/api/<package>.md`
- Entry in root `pnpm-workspace.yaml`
- Entry in root [`vitest.workspace.ts`](vitest.workspace.ts) — **not** `vitest.config.ts`, which is
  deliberately empty. Vitest 2 discovers projects through the workspace file only; a package missing
  from it is silently skipped by `pnpm test`. See [ADR-003](docs/decisions/003-test-resolution.md).
- Entry in root [`vitest.aliases.ts`](vitest.aliases.ts) if the package is imported by another
  package's tests, so it resolves to source rather than to a built `dist/`
- Entry in root `package.json` build script

---

## Documenting API changes

If you change or add a public API:

- Update the relevant `packages/<name>/README.md`
- Update `docs/api/<name>.md`
- Update examples in the root `README.md` if affected
- Update `docs/concepts/architecture.md` if the package structure changes

---

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and on every
pull request:

| Job          | What it runs                                                                               |
| ------------ | ------------------------------------------------------------------------------------------ |
| `check`      | `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` |
| `demo build` | `pnpm build` then `pnpm demo:build`                                                        |
| `changeset`  | `pnpm changeset status` — pull requests only                                               |

The `check` job runs on Node 18, 20, and 22 on Linux, plus Node 20 on Windows.

Three things worth knowing before you push:

- **`pnpm build` runs before `pnpm typecheck`, and has to.** `tsc` resolves `@filterbridge/*`
  through each sibling's emitted `.d.ts`, and `dist/` is gitignored — so on a fresh clone
  `pnpm typecheck` fails with `TS2307` until the packages have been built once. `pnpm test` does
  not have this constraint: vitest aliases `@filterbridge/*` to source
  ([`vitest.aliases.ts`](vitest.aliases.ts)), so the suite runs on a clean clone with no build and
  never reports on stale `dist` output. Before changing that, read
  [ADR-003](docs/decisions/003-test-resolution.md) — it records the bug that made it necessary.
- **The install uses `--frozen-lockfile`.** If you add or change a dependency, commit the updated
  `pnpm-lock.yaml` or CI will fail on the install step.
- **Changes to any workspace package need a changeset** — that means `apps/demo` too, not only
  `packages/**`. `@filterbridge/demo` is private and never published, but changesets still counts it
  as changed, so a commit touching nothing but `apps/demo/README.md` fails the check. Run
  `pnpm changeset`, or `pnpm changeset add --empty` for a change that should not trigger a release.

  **Commit the generated file.** `changeset status --since=origin/main` looks for changesets through
  git, so an uncommitted one does not count and the job fails exactly as if you had not created it.

---

## Opening a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes.
3. Run `pnpm build`, `pnpm typecheck`, `pnpm test`, and `pnpm demo:build`.
4. All checks must pass before submitting — CI runs the same ones.
5. Add a changeset if you touched `packages/**`.
6. Fill in the PR template.
7. Keep PRs focused — one logical change per PR.

PRs that break existing tests, skip type checking, or add undocumented API changes will not be merged.

---

## Issues

Use the GitHub issue templates:

- **Bug report** — something is broken
- **Feature request** — new capability or API
- **Documentation** — something is wrong or missing in docs

Check for existing issues before opening a new one.

---

## Code style

- TypeScript strict mode. No `any` in public types.
- No external runtime dependencies added to packages without discussion.
- Keep functions pure where possible.
- Prefer readable code over clever abstractions.
- Default to no comments — code should be self-explanatory. Add a comment only when the _why_ is non-obvious.

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
