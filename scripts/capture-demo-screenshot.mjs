/**
 * Captures a screenshot of the FilterBridge demo app.
 *
 * Usage:
 *   1. Start the demo in another terminal: pnpm demo
 *   2. Run this script: pnpm screenshot
 *
 * The screenshot is saved to docs/assets/filterbridge-demo.png
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUTPUT = resolve(ROOT, 'docs', 'assets', 'filterbridge-demo.png')
const DEMO_URL = 'http://localhost:5173'

async function isServerRunning() {
  try {
    const res = await fetch(DEMO_URL, { signal: AbortSignal.timeout(2000) })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

async function main() {
  console.log('FilterBridge demo screenshot capture')
  console.log('-------------------------------------')

  const running = await isServerRunning()
  if (!running) {
    console.error(`\nError: demo server is not running at ${DEMO_URL}`)
    console.error('\nStart it first with:')
    console.error('  pnpm demo')
    console.error('\nThen run this script again:')
    console.error('  pnpm screenshot')
    process.exit(1)
  }

  const assetsDir = resolve(ROOT, 'docs', 'assets')
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true })
  }

  console.log(`Demo is running at ${DEMO_URL}`)
  console.log('Launching Chromium...')

  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })

    console.log('Navigating to demo...')
    await page.goto(DEMO_URL, { waitUntil: 'networkidle' })

    const fillBtn = page.locator('button', { hasText: /fill example/i })
    if (await fillBtn.count() > 0) {
      console.log('Clicking "Fill example"...')
      await fillBtn.first().click()
      await page.waitForTimeout(300)
    } else {
      console.log('No "Fill example" button found — capturing current state')
    }

    console.log(`Saving screenshot to ${OUTPUT}`)
    await page.screenshot({ path: OUTPUT, fullPage: false })

    console.log('\nDone! Screenshot saved to:')
    console.log(`  docs/assets/filterbridge-demo.png`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('Screenshot failed:', err.message)
  process.exit(1)
})
