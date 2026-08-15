# Release checklist

Use this checklist before publishing packages to npm.

## Pre-publish validation

- [ ] Confirm package names are available on npm
  - `@filterbridge/core`
  - `@filterbridge/react`
  - `@filterbridge/browser`
  - `@filterbridge/tanstack`
  - `@filterbridge/next`
- [ ] Confirm GitHub repository URL: `https://github.com/gabpaesschulz/filterbridge`
- [ ] Update `repository.url` in all `package.json` files if the real URL differs

## Build and test

- [ ] `pnpm install` — clean install from scratch
- [ ] `pnpm build` — all 5 packages build without errors
- [ ] `pnpm typecheck` — no TypeScript errors
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm format:check` — clean. Enforced in CI since `0.3.0`
- [ ] `pnpm demo:build` — demo app builds without errors
- [ ] `pnpm demo` then `pnpm demo:a11y` — zero violations. Not in CI, so a release is the moment it
      gets run. If it reports zero, sanity-check it against a known-bad value first; a rule that
      silently did not run also reports zero

## Package inspection

- [ ] `pnpm pack:all` — generates tarballs to `.packs/`
- [ ] Inspect each tarball: `tar -tzf .packs/<tarball>.tgz`
  - `package/dist/` — build artifacts present
  - `package/README.md` — README included
  - `package/package.json` — metadata correct
  - No `src/`, no `node_modules/`, no test files, no `.tsbuildinfo`
- [ ] Verify `dist/index.js` (ESM), `dist/index.cjs` (CJS), `dist/index.d.ts`, `dist/index.d.cts` are present in each tarball
- [ ] **`@filterbridge/browser` ships a second entry point.** Verify `dist/react.js`,
      `dist/react.cjs`, `dist/react.d.ts` and `dist/react.d.cts` are in its tarball as well —
      `tsup` builds both entries, and only the root one is covered by the check above

## Smoke test

- [ ] Run the smoke test from packed tarballs (see `.smoke/`)
  ```bash
  cd .smoke
  # Wipe first. npm resolves `file:` deps from its cache by name+version, so
  # re-running `npm install` over a rebuilt tarball of the *same* version
  # silently reinstalls the old code and the smoke test passes against it.
  rm -rf node_modules package-lock.json
  npm install
  node src/esm.mjs
  node src/cjs.cjs
  ```
- [ ] Update the tarball versions in `.smoke/package.json` after `changeset version` — they are
      pinned filenames. Bump all five entries to the new version
      (`file:../.packs/filterbridge-core-<version>.tgz`, and the same for react, browser, tanstack,
      next)
- [ ] Extend the `.smoke/` assertions to cover whatever public API the release adds, in **both**
      `src/esm.mjs` and `src/cjs.cjs`. An assertion that encodes a proxy rather than a rule will
      break when the rule stays true: `0.3.0` had to replace `dateRange.length === 0` — arity
      standing in for "takes no configuration" — because the builder gained a `keys` option
- [ ] Confirm both entry points of `@filterbridge/browser` resolve — the smoke suite imports
      `@filterbridge/browser` and `@filterbridge/browser/react` in ESM and in CJS
- [ ] Confirm no runtime errors or import resolution failures

## Content review

- [ ] README examples are accurate and match the published API
- [ ] All package descriptions are filled
- [ ] All packages have `license: "MIT"`
- [ ] All packages have `author: "Gabriel Paes Schulz"`
- [ ] `sideEffects: false` is set in all packages
- [ ] `LICENSE` file exists at repo root

## Versioning

- [ ] All packages are at the same version — they are a `fixed` group, so one `minor` changeset
      moves all five
- [ ] A changeset exists for every published change, and behavior changes are spelled out in it
      rather than filed as generic bug fixes
- [ ] Run `pnpm changeset version` to apply the changeset and update `CHANGELOG.md` files
- [ ] Review generated `CHANGELOG.md` in each package

## npm auth

- [ ] `npm whoami` — confirm you are logged in as the correct npm user
- [ ] 2FA is configured on your npm account
- [ ] Scoped packages under `@filterbridge` are owned by your account

## Publish

Run in order (core first, dependents after):

```bash
# Do NOT run these until all checks above are complete

pnpm --filter @filterbridge/core publish --access public
pnpm --filter @filterbridge/react publish --access public
pnpm --filter @filterbridge/browser publish --access public
pnpm --filter @filterbridge/tanstack publish --access public
pnpm --filter @filterbridge/next publish --access public
```

Or use Changesets publish (after `changeset version`):

```bash
pnpm changeset publish
```

## Post-publish

- [ ] Verify packages appear on npm: `https://www.npmjs.com/package/@filterbridge/core`
- [ ] Tag the release in git: `git tag v<version> && git push --tags`
- [ ] Create GitHub Release with the same tag. **Paste the body from the release note in
      `docs/releases/<version>.md`** — do not write a separate `<version>-github-release.md`. A
      second file describing the same release drifts from the first and duplicates the maintenance;
      the `v0.1.0` one was deleted for exactly that reason.
- [ ] Update `README.md` with installation instructions pointing to the published version
- [ ] **Bump `examples/next-app-router` to the published version and re-run it.** It is pinned to a
      published range and is outside the workspace, so nothing else will catch it going stale:
      `cd examples/next-app-router && npm install && npm run dev`, then update the "Verified against"
      table in its README
- [ ] Announce release if applicable

---

## v0.1.0 release candidate status (Wave 10)

**Validated on: 2026-06-01**

### Infrastructure

- [x] GitHub repository exists: `https://github.com/gabpaesschulz/filterbridge`
- [x] All 5 npm package names verified available (404 on registry)
  - `@filterbridge/core` — available
  - `@filterbridge/react` — available
  - `@filterbridge/browser` — available
  - `@filterbridge/tanstack` — available
  - `@filterbridge/next` — available
- [x] Changeset consumed — `.changeset/initial-release.md` removed
- [x] `CHANGELOG.md` generated in all 5 packages (v0.1.0)
- [x] All `package.json` files include `CHANGELOG.md` in `files`

### Build validation

- [x] `pnpm install` — clean
- [x] `pnpm build` — 5 packages, all pass
- [x] `pnpm typecheck` — 0 errors
- [x] `pnpm test` — 299 tests, 17 test files, all pass
- [x] `pnpm demo:build` — Vite build success

### Package inspection

- [x] `pnpm pack:all` — 5 tarballs in `.packs/`
- [x] All tarballs contain: `dist/`, `README.md`, `CHANGELOG.md`, `package.json`
- [x] `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts` present in each
- [x] `workspace:*` resolved to `0.1.0` in packed tarballs

### Smoke test

- [x] ESM smoke test — 39 passed, 0 failed
- [x] CJS smoke test — 29 passed, 0 failed

### Content review

- [x] Root README updated: packages table, architecture, roadmap
- [x] `packages/core/README.md` — updated status and installation
- [x] `packages/react/README.md` — updated status, installation, and known limitations
- [x] `packages/browser/README.md` — updated next adapter reference
- [x] `packages/tanstack/README.md` — removed internal wave language
- [x] `packages/next/README.md` — fixed repository link

### Publish — done

- [x] `npm whoami` — confirmed npm login as correct user
- [x] Confirmed 2FA is configured on npm account
- [x] `@filterbridge` organization scope created on npm
- [x] Wave 10 changes committed
- [x] `git tag v0.1.0`
- [x] `pnpm changeset publish` — all five packages live on npm

`0.1.0` is published and superseded by `0.2.0`. This section is kept as the record of what the first
release had to go through; the live checklist is the `0.2.0` one below.

---

## v0.2.0 release candidate status (Sprint 0)

**Validated on: 2026-08-13** — see [`docs/releases/v0.2.0.md`](./releases/v0.2.0.md) for the notes
draft and [Sprint 0](./sprints/sprint-0/README.md) for the work itself.

### Build validation

- [x] `pnpm test` — 538 tests, 28 test files, all pass, with every `dist/` deleted
- [x] `pnpm typecheck` — 0 errors
- [x] `pnpm lint` — clean
- [x] `pnpm build` — 5 packages, dual ESM/CJS + `.d.ts` / `.d.cts`
- [x] `pnpm demo:build` — Vite build success
- [x] Each fix reverted one at a time — suite red every time, verified rather than assumed
- [x] CI green on the pull request: Node 18/20/22 on Linux, Node 20 on Windows, plus demo build and
      changeset check

### Package inspection

- [x] `pnpm pack:all` — 5 tarballs in `.packs/`

### Smoke test

- [x] ESM smoke test — 54 passed, 0 failed
- [x] CJS smoke test — 38 passed, 0 failed
- [x] `@filterbridge/browser/react` subpath resolves in both module systems
- [x] Root entry of `@filterbridge/browser` imports in a project with **no React installed**, in
      ESM and CJS — the optional peer dependency claim, verified rather than assumed
- [x] The DTO-carries-defaults contract is asserted against the packed tarballs, not only in the
      unit suite

### Changesets

- [x] 10 changesets, each owned by a single package so that every `CHANGELOG.md` opens with what
      changed in _that_ package. `external-state-sync` and `filter-defaults` were each split in two
      for this reason (`popstate-sync` for browser, `hook-schema-defaults` for react)
- [x] Four are `minor` (core defaults, `syncState`, hook defaults, `resetToInitial`, plus
      `usePopstateSync` for browser) — the release is `0.2.0`
- [x] Every behavior change is stated in the changeset that causes it
- [x] `filter-defaults.md` was edited rather than supplemented as the design narrowed. A changeset
      is the source of a release note, not an audit log: nobody reading the `0.2.0` CHANGELOG saw
      the intermediate shape where all six builders accepted a default. While a change is
      unpublished, its changeset is editable.

### Publish — done (2026-08-15)

- [x] `pnpm changeset version` — all five at `0.2.0`, `CHANGELOG.md` generated, changesets consumed
- [x] `.smoke/package.json` repinned to the `0.2.0` tarballs, `.packs/` cleared of `0.1.0` so a
      cached install could not substitute them, `node_modules` wiped — 54 ESM / 38 CJS pass
- [x] Re-read the documentation pass — API reference, READMEs, roadmap and release notes all
      describe `0.2.0` rather than the path taken to it
- [x] **`main` contains the release commit.** PR #1 merged at `70ac225`, _before_ the documentation
      pass and the version bump were pushed — so a second PR from `sprint-0` was needed. It merged
      at `8a07d2e`, which is the commit the release was built from. Worth remembering next sprint:
      a version bump that lands after its own PR needs a follow-up PR, and tagging the branch
      instead would have tagged a commit that was never on `main`
- [x] Demo header version badge — no longer a manual step. `apps/demo/vite.config.ts` injects it
      from `packages/core/package.json` via `define`, so `changeset version` updates the deployed
      demo on its own. Nothing to do here unless the build stops inlining it.
- [x] CI green on the release commit — 5 successful checks on `8a07d2e`
- [x] `npm whoami` and 2FA confirmed
- [x] `git tag v0.2.0` from `main`
- [x] `pnpm changeset publish` — note it creates one tag per package
      (`@filterbridge/core@0.2.0`, …) and **not** `v0.2.0`, because this is a monorepo. The manual
      `v0.2.0` above is additional and does not conflict. Tags are created locally after the npm
      publish succeeds, so `git push --tags` is still a separate step
- [x] GitHub Release published from `docs/releases/v0.2.0.md` —
      https://github.com/gabpaesschulz/filterbridge/releases/tag/v0.2.0

`0.2.0` is live on npm: `npm view @filterbridge/core version` returns `0.2.0`, and the same for the
other four packages.
