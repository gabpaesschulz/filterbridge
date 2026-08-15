# GitHub showcase checklist

Steps to complete before or after the first public announcement.

---

## Repository settings (manual — GitHub UI)

- [x] Repository description — live as `Schema-first filters for React admin dashboards.`
- [x] Website URL in repository About — `https://filterbridge-demo.vercel.app`
- [x] npm package URLs — README badges
- [x] Topics (gear icon next to **About** on the repository sidebar). Live:
      `typescript`, `react`, `nextjs`, `tanstack-table`, `filters`, `url-state`, `search-params`,
      `query-params`

  Topics improve discoverability in GitHub search and on the npm registry. They are platform
  configuration rather than documentation, so this list is the only copy — there is no separate file.

- [ ] Optional additional topics, not yet applied: `admin-dashboard`, `frontend`,
      `developer-tools`, `npm-package`, `open-source`, `monorepo`
- [ ] Pin repository on GitHub profile (if applicable)

---

## README

- [x] Screenshot captured at `docs/assets/filterbridge-demo.png` via `pnpm demo && pnpm screenshot`
- [ ] Recapture the screenshot — the committed one predates the Sprint 0 demo changes (tri-state
      boolean control, TanStack table) and no longer matches what the live demo renders
- [x] Add live demo URL — https://filterbridge-demo.vercel.app
- [x] npm badges reference published packages
- [x] Install instructions are accurate
- [x] Examples are accurate and runnable

---

## GitHub Release

- [x] Create GitHub release from tag `v0.1.0` — https://github.com/gabpaesschulz/filterbridge/releases/tag/v0.1.0
- [x] Create GitHub release from tag `v0.2.0` — https://github.com/gabpaesschulz/filterbridge/releases/tag/v0.2.0
- [x] Attach no binaries (packages are on npm, not GitHub releases)

Note that `pnpm changeset publish` creates one tag per package (`@filterbridge/core@0.2.0`, …), not
a `vX.Y.Z` tag. The `vX.Y.Z` tags the releases are cut from are created manually — see
[the release checklist](./release-checklist.md).

---

## Demo deployment

- [x] Deploy demo to Vercel — https://filterbridge-demo.vercel.app
- [x] Update `README.md` Demo section with live URL
- [x] Update `docs/guides/deploy-demo.md` Live demo URL section

---

## npm packages

- [x] All 5 packages published — `latest` is `0.2.0`
- [x] npm README for each package links to GitHub
- [ ] Verify npm pages render correctly at:
  - https://www.npmjs.com/package/@filterbridge/core
  - https://www.npmjs.com/package/@filterbridge/react
  - https://www.npmjs.com/package/@filterbridge/browser
  - https://www.npmjs.com/package/@filterbridge/tanstack
  - https://www.npmjs.com/package/@filterbridge/next

---

## Optional marketing

- [ ] Post to dev.to
- [ ] Post to LinkedIn

Drafts for these used to live in `docs/marketing/`, which was deliberately removed from version
control — announcement copy is not project documentation and went stale between releases.

- [ ] Submit to relevant newsletters or communities
