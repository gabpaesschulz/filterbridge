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
  pnpm install
  node src/cjs.cjs
  node --input-type=module < src/esm.mjs
  ```
- [ ] Confirm no runtime errors or import resolution failures

## Content review

- [ ] README examples are accurate and match the published API
- [ ] All package descriptions are filled
- [ ] All packages have `license: "MIT"`
- [ ] All packages have `author: "Gabriel Paes Schulz"`
- [ ] `sideEffects: false` is set in all packages
- [ ] `LICENSE` file exists at repo root

## Versioning

- [ ] All packages are at the same version (`0.1.0` for initial release)
- [ ] Changeset exists for the release: `.changeset/initial-release.md`
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
