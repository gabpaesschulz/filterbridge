import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The round-trip test pairs usePopstateSync with useFilterBridge. Without
      // this alias it would resolve to packages/react/dist, so the result would
      // depend on whether `pnpm build` ran first — and a stale dist would fail
      // as "syncState is not a function" rather than something readable.
      '@filterbridge/react': fileURLToPath(new URL('../react/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
  },
})
