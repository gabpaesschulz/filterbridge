/**
 * Runs axe-core against the demo in real Chromium, with `color-contrast`
 * ENABLED.
 *
 * This exists because the committed jsdom suite
 * (apps/demo/src/__tests__/a11y.test.tsx) cannot do it. jsdom has no layout
 * engine and no computed colours, so axe skips `color-contrast` there — and a
 * rule that the environment silently cannot evaluate is worse than an
 * acknowledged gap. The two audits have different capabilities on purpose:
 * jsdom covers structure on every `pnpm test`, this covers contrast on demand.
 *
 * Usage:
 *   1. Start the demo in another terminal: pnpm demo
 *   2. Run this script:                    pnpm demo:a11y
 *
 * Exits non-zero on any violation, so it can be piped into a gate later.
 *
 * NOT wired into CI, deliberately. It needs a Chromium download and a running
 * dev server, which is a materially heavier job than anything the workflow does
 * today. It is a reasonable candidate for a later CI job; that decision was
 * left open in Sprint 1 task 3 rather than taken by default.
 */

import { chromium } from 'playwright'
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DEMO_URL = 'http://localhost:5173'

/** axe-core is a devDependency of apps/demo, not of the workspace root. */
function axeSource() {
  const requireFromDemo = createRequire(resolve(ROOT, 'apps', 'demo', 'package.json'))
  try {
    return readFileSync(requireFromDemo.resolve('axe-core/axe.min.js'), 'utf8')
  } catch {
    console.error('Error: could not resolve axe-core from apps/demo.')
    console.error('Run `pnpm install` first.')
    process.exit(1)
  }
}

async function isServerRunning() {
  try {
    const res = await fetch(DEMO_URL, { signal: AbortSignal.timeout(2000) })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

async function auditPage(page, label) {
  const results = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    })
  })

  const violations = results.violations
  const contrast = violations.filter((v) => v.id === 'color-contrast')
  const other = violations.filter((v) => v.id !== 'color-contrast')

  console.log(`\n${label}`)
  console.log('  color-contrast violations: ' + contrast.reduce((n, v) => n + v.nodes.length, 0))
  console.log('  other violations:          ' + other.reduce((n, v) => n + v.nodes.length, 0))

  for (const violation of violations) {
    console.log(`\n  [${violation.id}] ${violation.help} (${violation.nodes.length})`)
    for (const node of violation.nodes.slice(0, 10)) {
      console.log(`    ${node.target.join(' ')}`)
      const message = node.any[0]?.message ?? node.all[0]?.message
      if (message) console.log(`      ${message.replace(/\s+/g, ' ')}`)
    }
    if (violation.nodes.length > 10) {
      console.log(`    … and ${violation.nodes.length - 10} more`)
    }
  }

  return violations.reduce((n, v) => n + v.nodes.length, 0)
}

async function main() {
  console.log('FilterBridge demo accessibility audit (real Chromium)')
  console.log('-----------------------------------------------------')

  if (!(await isServerRunning())) {
    console.error(`\nError: demo server is not running at ${DEMO_URL}`)
    console.error('\nStart it first with:\n  pnpm demo')
    console.error('\nThen run this script again:\n  pnpm demo:a11y')
    process.exit(1)
  }

  const axe = axeSource()
  const browser = await chromium.launch({ headless: true })
  let total = 0

  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(DEMO_URL, { waitUntil: 'networkidle' })
    await page.addScriptTag({ content: axe })

    total += await auditPage(page, 'Initial render (every status pill visible)')

    // The filled state renders the active-filter summary, the URL badge and a
    // filtered table — components the initial render does not exercise.
    const fillBtn = page.locator('button', { hasText: /fill example/i })
    if ((await fillBtn.count()) > 0) {
      await fillBtn.first().click()
      await page.waitForTimeout(300)
      await page.addScriptTag({ content: axe })
      total += await auditPage(page, 'After "Fill example"')
    }
  } finally {
    await browser.close()
  }

  console.log('\n-----------------------------------------------------')
  if (total === 0) {
    console.log('No violations.')
    return
  }
  console.log(`${total} violation node(s). See above.`)
  process.exit(1)
}

main().catch((err) => {
  console.error('Audit failed:', err.message)
  process.exit(1)
})
