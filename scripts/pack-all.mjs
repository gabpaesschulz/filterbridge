#!/usr/bin/env node
import { execSync } from 'child_process'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dest = resolve(root, '.packs')

mkdirSync(dest, { recursive: true })

const packages = ['core', 'react', 'browser', 'tanstack', 'next']

for (const pkg of packages) {
  console.log(`\nPacking @filterbridge/${pkg}...`)
  const pkgDir = resolve(root, 'packages', pkg)
  execSync(`pnpm pack --pack-destination "${dest}"`, {
    stdio: 'inherit',
    cwd: pkgDir,
  })
}

console.log('\nAll packages packed to .packs/')
