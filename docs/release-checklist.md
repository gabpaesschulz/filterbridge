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
- [ ] `pnpm demo:build` — demo app builds without errors

## Package inspection

- [ ] `pnpm pack:all` — generates tarballs to `.packs/`
- [ ] Inspect each tarball: `tar -tzf .packs/<tarball>.tgz`
  - `package/dist/` — build artifacts present
  - `package/README.md` — README included
  - `package/package.json` — metadata correct
  - No `src/`, no `node_modules/`, no test files, no `.tsbuildinfo`
- [ ] Verify `dist/index.js` (ESM), `dist/index.cjs` (CJS), `dist/index.d.ts`, `dist/index.d.cts` are present in each tarball

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
      pinned filenames (`file:../.packs/filterbridge-core-0.1.0.tgz`)
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
- [ ] Tag the release in git: `git tag v0.1.0 && git push --tags`
- [ ] Create GitHub Release with tag `v0.1.0`
- [ ] Update `README.md` with installation instructions pointing to the published version
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

### Pending before publish
- [ ] `npm whoami` — confirm npm login as correct user
- [ ] Confirm 2FA is configured on npm account
- [ ] Create `@filterbridge` organization scope on npm (or confirm user owns it)
- [ ] Commit Wave 10 changes to git
- [ ] `git tag v0.1.0`
- [ ] Run `pnpm changeset publish` or individual publish commands

---

## v0.2.0 release candidate status (Sprint 0)

**Validated on: 2026-08-13** — see [`docs/releases/v0.2.0.md`](./releases/v0.2.0.md) for the notes
draft and [Sprint 0](./sprints/sprint-0/README.md) for the work itself.

### Build validation
- [x] `pnpm test` — 507 tests, 28 test files, all pass
- [x] `pnpm typecheck` — 0 errors
- [x] `pnpm lint` — clean
- [x] `pnpm build` — 5 packages, dual ESM/CJS + `.d.ts` / `.d.cts`
- [x] Each Sprint 0 fix reverted one at a time — suite red every time, verified rather than assumed

### Package inspection
- [x] `pnpm pack:all` — 5 tarballs in `.packs/`

### Smoke test
- [x] ESM smoke test — 51 passed, 0 failed (12 new assertions for the 0.2.0 surface)
- [x] CJS smoke test — 35 passed, 0 failed (6 new)
- [x] `@filterbridge/browser/react` subpath resolves in both module systems

### Changesets
- [x] 8 changesets present: `repeated-query-params`, `non-finite-numbers`,
      `serialization-validation`, `empty-value-normalization`, `dto-boolean-parity`,
      `filter-defaults`, `external-state-sync`, `reset-semantics`
- [x] Three are `minor` (defaults, `syncState`, `resetToInitial`) — the release is `0.2.0`
- [x] Every behavior change is stated in the changeset that causes it

### Pending before publish
- [ ] `pnpm changeset version` — bumps all five to `0.2.0` and writes the `CHANGELOG.md` files
- [ ] Update the pinned tarball versions in `.smoke/package.json`, then re-pack and re-run the
      smoke test against `0.2.0` tarballs (wiping `node_modules` first — see above)
- [ ] Update the hardcoded version badge in the demo header
      (`apps/demo/src/App.tsx` — `<span className="header-version">v0.1.0</span>`); it is not derived
      from any `package.json`, so `changeset version` leaves the deployed demo claiming `v0.1.0`
- [ ] CI green on the release commit
- [ ] `npm whoami` and 2FA confirmed
- [ ] `git tag v0.2.0`
- [ ] `pnpm changeset publish`
- [ ] Publish the GitHub Release from `docs/releases/v0.2.0.md`
