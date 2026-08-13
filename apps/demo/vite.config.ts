/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { filterbridgeAliases } from '../../vitest.aliases'

// Test config lives here rather than in a separate vitest.config.ts so the
// root workspace picks up `environment: 'jsdom'` whichever config file it
// resolves for this project.
export default defineConfig({
  plugins: [react()],
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
