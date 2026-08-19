import { defineConfig } from 'vitest/config'
import { filterbridgeAliases } from '../../vitest.aliases'
import { react19Aliases } from '../../vitest.react-19'

/**
 * The same test files as vitest.config.ts, run against React 19.
 *
 * Named explicitly because both projects share a directory, so the package
 * name that vitest would otherwise use would label them identically.
 */
export default defineConfig({
  test: {
    name: '@filterbridge/react · react 19',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    env: { FILTERBRIDGE_REACT_MAJOR: '19' },
    alias: [...react19Aliases, ...filterbridgeAliases],
  },
})
