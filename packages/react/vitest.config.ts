import { defineConfig } from 'vitest/config'
import { filterbridgeAliases } from '../../vitest.aliases'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    // Read by react-version.test.* — the project says which React it runs, and
    // the test checks that it actually got it. See vitest.react-19.ts.
    env: { FILTERBRIDGE_REACT_MAJOR: '18' },
    // Cross-package imports resolve to source, not dist — see vitest.aliases.ts.
    alias: filterbridgeAliases,
  },
})
