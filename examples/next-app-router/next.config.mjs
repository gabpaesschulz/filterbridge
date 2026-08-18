import { dirname } from 'path'
import { fileURLToPath } from 'url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This example sits outside the pnpm workspace on purpose, so there are two
  // lockfiles above it: this directory's package-lock.json and the repository's
  // pnpm-lock.yaml. Next.js walks up looking for a workspace root, finds the
  // pnpm one, and warns that its guess may be wrong — which it is. Pinning the
  // root to this directory is the fix, and the warning is a direct consequence
  // of the out-of-workspace decision rather than a mistake in the app.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
}

export default nextConfig
