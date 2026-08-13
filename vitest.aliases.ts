import { fileURLToPath } from 'node:url'

function source(pkg: string, entry = 'index.ts'): string {
  return fileURLToPath(new URL(`./packages/${pkg}/src/${entry}`, import.meta.url))
}

/**
 * Every `@filterbridge/*` specifier a test can reach, pointed at source.
 *
 * Without these, a cross-package import resolves through the sibling's `dist/`,
 * which means the suite exercises whatever was built last: a stale `dist` hides
 * a regression in `src`, a missing one fails the run with an unresolvable
 * import, and a stack trace points at bundled output instead of the line that
 * broke. That is not hypothetical — it is how a broken `syncState` invariant
 * passed `pnpm test` while failing `pnpm --filter @filterbridge/browser test`.
 *
 * The division of labour: vitest tests behavior against source, and `.smoke/`
 * tests packaging by installing the real tarballs and exercising the export map
 * in both ESM and CJS. Neither job is done well by importing `dist` from a unit
 * test.
 *
 * Order matters. Vite matches string aliases by prefix, so a subpath has to come
 * before the package it belongs to or `@filterbridge/browser` would swallow
 * `@filterbridge/browser/react`.
 */
export const filterbridgeAliases = [
  { find: '@filterbridge/browser/react', replacement: source('browser', 'react.ts') },
  { find: '@filterbridge/core', replacement: source('core') },
  { find: '@filterbridge/react', replacement: source('react') },
  { find: '@filterbridge/browser', replacement: source('browser') },
  { find: '@filterbridge/tanstack', replacement: source('tanstack') },
  { find: '@filterbridge/next', replacement: source('next') },
]
