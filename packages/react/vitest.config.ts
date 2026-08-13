import { defineConfig } from 'vitest/config'
import { filterbridgeAliases } from '../../vitest.aliases'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    // Cross-package imports resolve to source, not dist — see vitest.aliases.ts.
    alias: filterbridgeAliases,
  },
})
