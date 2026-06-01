# GitHub showcase checklist

Steps to complete before or after the first public announcement.

---

## Repository settings (manual — GitHub UI)

- [ ] Add repository description:
  `Schema-first filters for React admin screens.`
- [ ] Add website URL to repository About:
  `https://filterbridge-demo.vercel.app`
- [ ] Add npm package URL to the About section or README badge
- [ ] Add topics from [`docs/github-topics.md`](./github-topics.md):
  `typescript`, `react`, `nextjs`, `tanstack-table`, `filters`, `url-state`, `search-params`, `admin-dashboard`, `frontend`, `developer-tools`, `npm-package`, `open-source`, `monorepo`
- [ ] Pin repository on GitHub profile (if applicable)

---

## README

- [x] Screenshot added at `docs/assets/filterbridge-demo.png` (run `pnpm demo && pnpm screenshot` to generate)
- [ ] Replace screenshot with real image after running `pnpm screenshot`
- [x] Add live demo URL — https://filterbridge-demo.vercel.app
- [x] npm badges reference published packages
- [x] Install instructions are accurate
- [x] Examples are accurate and runnable

---

## GitHub Release

- [x] Create GitHub release from tag `v0.1.0` — https://github.com/gabpaesschulz/filterbridge/releases/tag/v0.1.0
- [x] Use release notes from [`docs/releases/v0.1.0-github-release.md`](./releases/v0.1.0-github-release.md)
- [x] Attach no binaries (packages are on npm, not GitHub releases)

---

## Demo deployment

- [x] Deploy demo to Vercel — https://filterbridge-demo.vercel.app
- [x] Update `README.md` Demo section with live URL
- [x] Update `docs/guides/deploy-demo.md` Live demo URL section

---

## npm packages

- [x] All 5 packages published at `0.1.0`
- [x] npm README for each package links to GitHub
- [ ] Verify npm pages render correctly at:
  - https://www.npmjs.com/package/@filterbridge/core
  - https://www.npmjs.com/package/@filterbridge/react
  - https://www.npmjs.com/package/@filterbridge/browser
  - https://www.npmjs.com/package/@filterbridge/tanstack
  - https://www.npmjs.com/package/@filterbridge/next

---

## Optional marketing

- [ ] Post to dev.to (see [`docs/marketing/devto-post-outline.md`](./marketing/devto-post-outline.md))
- [ ] Post to LinkedIn (see [`docs/marketing/linkedin-post.md`](./marketing/linkedin-post.md))
- [ ] Submit to relevant newsletters or communities
