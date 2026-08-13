/// <reference types="vitest" />
import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { filterbridgeAliases } from '../../vitest.aliases'

// The version the header badge announces is the version of the packages the
// demo is showing off, so it is read from @filterbridge/core rather than kept
// by hand — `changeset version` then updates the deployed demo for free.
const { version } = createRequire(import.meta.url)('../../packages/core/package.json') as {
  version: string
}

// Test config lives here rather than in a separate vitest.config.ts so the
// root workspace picks up `environment: 'jsdom'` whichever config file it
// resolves for this project.
export default defineConfig({
  plugins: [react()],
  define: {
    __FILTERBRIDGE_VERSION__: JSON.stringify(version),
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    // Deliberately `test.alias` and not `resolve.alias`: the a11y suite should
    // exercise the same source the packages' own tests do, but `vite build`
    // must keep resolving @filterbridge/* through dist — that is what the demo
    // job in CI is verifying, and what a real consumer does.
    alias: filterbridgeAliases,
  },
})
