import { defineWorkspace } from 'vitest/config'

/**
 * Vitest 2 discovers workspace projects through this file, not through a
 * `test.projects` field in `vitest.config.ts` — that option only exists in
 * Vitest 3 and is silently ignored here, which made every per-package config
 * (environments, and the `@filterbridge/react` source alias in
 * `packages/browser/vitest.config.ts`) inert under a root `pnpm test`.
 */
export default defineWorkspace([
  './packages/core',
  './packages/react',
  './packages/browser',
  './packages/tanstack',
  './packages/next',
  './apps/demo',
  // The same files as the two entries above, run against React 19. Both
  // packages declare react: >=18 as a peer; without these, half of that range
  // is a claim nothing checks. See vitest.react-19.ts.
  './packages/react/vitest.react-19.config.ts',
  './packages/browser/vitest.react-19.config.ts',
])
