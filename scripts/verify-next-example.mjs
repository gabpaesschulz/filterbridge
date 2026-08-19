/**
 * Drives `examples/next-app-router` in real Chromium and checks the claims the
 * guide makes about it.
 *
 * This exists because Sprint 1 verified the example with a Playwright run that
 * was never committed — 26 assertions whose only surviving trace was a sentence
 * in a sprint document. The example is the one place a real Next.js router,
 * React 19 and the server/client boundary meet, and it is where the only React
 * defect this project has ever found was found, so the evidence should be
 * re-runnable.
 *
 * It lives here, at the repository root, rather than inside the example, for
 * the same reason `audit-demo-a11y.mjs` does: `playwright` is already a root
 * devDependency, and the example is deliberately outside the pnpm workspace
 * with its own npm install. Putting a test runner in there would make every
 * reader of the example pay for it.
 *
 * Usage:
 *   1. cd examples/next-app-router && npm install && npm run dev
 *   2. pnpm verify:next-example
 *
 * It must be `npm run dev`, not a production build, and the script refuses to
 * run against one. React's "Cannot update a component while rendering" warning
 * — the assertion this file exists for — is stripped from production builds, so
 * a `next start` run reports eleven green checks against a library that has the
 * defect. That was measured, not assumed: 0.3.1 passes all eleven under
 * `next start` and fails the console check under `next dev`.
 *
 * Exits non-zero on any failure.
 *
 * NOT wired into CI, deliberately, and for the reason the example is not:
 * a Next.js build plus a Chromium download on every pull request undoes the
 * point of keeping it out of the workspace. It is a manual release gate, listed
 * in docs/release-checklist.md next to `.smoke/` and `pnpm demo:a11y`.
 */

import { chromium } from 'playwright'

const BASE = process.env.EXAMPLE_URL ?? 'http://localhost:3000'

const results = []

function check(name, passed, detail = '') {
  results.push({ name, passed, detail })
  const mark = passed ? '  ok  ' : ' FAIL '
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  /**
   * The assertion that would have caught the render-phase defect. Every other
   * check in this file passed on 0.3.1 while `onChange` was firing during
   * render — this is the only one that failed.
   */
  const consoleProblems = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`))

  await page.goto(`${BASE}/`)
  await page.waitForLoadState('networkidle')

  // React Refresh is only installed by `next dev`, and it travels with the
  // development build of React — the one that still contains the warning below.
  const isDev = await page.evaluate(() => Boolean(window.$RefreshReg$))
  if (!isDev) {
    await browser.close()
    throw new Error(
      'The example is running a production build. React strips the render-phase ' +
        'warning there, so this run would pass regardless. Start it with `npm run dev`.'
    )
  }

  // Label-driven, the way a user reaches these controls. The inputs carry no
  // `name` or `type` attribute, so attribute selectors do not find them.
  const search = () => page.getByLabel('Search')
  const archived = () => page.getByLabel('Archived')

  // --- server parse ------------------------------------------------------
  await page.goto(`${BASE}/?status=paid&search=acme`)
  await page.waitForLoadState('networkidle')

  check('server-rendered state reaches the controls', (await search().inputValue()) === 'acme')

  // --- a filter change navigates ------------------------------------------
  await search().fill('acme corp')
  await page.waitForTimeout(400)
  const afterText = page.url()
  check('typing writes the URL', afterText.includes('acme'), decodeURI(afterText))

  await archived().selectOption('true')
  await page.waitForTimeout(400)
  check('a discrete control writes the URL', page.url().includes('archived=true'), page.url())

  // --- non-filter params survive ------------------------------------------
  await page.goto(`${BASE}/?status=paid&tab=open`)
  await page.waitForLoadState('networkidle')
  await archived().selectOption('false')
  await page.waitForTimeout(400)
  check('params outside the schema are preserved', page.url().includes('tab=open'), page.url())

  // --- back and forward ----------------------------------------------------
  // The guide was wrong about this twice before the example existed: a server
  // re-render does not reach an uncontrolled hook's state, and `router.replace`
  // leaves no entry to go back to.
  //
  // Driven with a select rather than the text input on purpose. Every keystroke
  // is its own `router.push`, so typing four characters buries the starting
  // entry four deep — a real app debounces, and this check should not depend on
  // that.
  await page.goto(`${BASE}/`)
  await page.waitForLoadState('networkidle')
  const start = page.url()

  await archived().selectOption('true')
  await page.waitForTimeout(400)
  const filtered = page.url()
  check('the filtered URL differs from the starting one', filtered !== start, filtered)

  await page.goBack()
  await page.waitForTimeout(600)
  check('back stays inside the app', page.url().startsWith(BASE), page.url())
  check('back returns to the previous URL', page.url() === start, page.url())
  check(
    'back restores the filter control, not just the URL',
    (await archived().inputValue()) === '',
    'usePopstateSync + syncState'
  )

  await page.goForward()
  await page.waitForTimeout(600)
  check('forward returns to the filtered URL', page.url() === filtered, page.url())
  check('forward restores the filter control', (await archived().inputValue()) === 'true')

  // --- the render-phase check ---------------------------------------------
  check(
    'no React warning during any of the above',
    consoleProblems.length === 0,
    consoleProblems.length ? consoleProblems.join(' | ') : 'clean console'
  )

  await browser.close()
}

try {
  console.log(`FilterBridge Next.js example verification (${BASE})`)
  console.log('-'.repeat(60))
  await main()
} catch (error) {
  console.error(`\nCould not drive the example at ${BASE}.`)
  console.error('Is it running under `npm run dev`? See the usage note at the top.\n')
  console.error(error)
  process.exit(1)
}

const failed = results.filter((r) => !r.passed)
console.log('-'.repeat(60))
console.log(`${results.length - failed.length}/${results.length} checks passed.`)
process.exit(failed.length === 0 ? 0 : 1)
