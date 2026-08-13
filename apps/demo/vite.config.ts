/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test config lives here rather than in a separate vitest.config.ts so the
// root workspace picks up `environment: 'jsdom'` whichever config file it
// resolves for this project.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
  },
})
