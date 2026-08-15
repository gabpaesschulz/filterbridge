---
---

Sprint 1's non-package work — nothing to release.

Empty on purpose, and one file rather than three, because `changeset status` fires on any workspace
package edit and all three of these touch one:

- **Formatting.** `pnpm format` across the repository, `.gitattributes` pinning text files to LF,
  and a `format` job in CI. Whitespace only.
- **Demo contrast.** `apps/demo`'s palette re-measured against WCAG AA, plus `pnpm demo:a11y`.
  `@filterbridge/demo` is private and never published.
- **Next.js example.** `examples/next-app-router/`, which sits outside the pnpm workspace.

The custom range keys in the same release are a separate, non-empty changeset.
