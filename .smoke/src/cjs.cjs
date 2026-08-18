// CJS smoke test — validates that all FilterBridge packages are requireable.

'use strict'

let passed = 0
let failed = 0

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

// ──────────────────────────────────────────────
// @filterbridge/core (CJS)
// ──────────────────────────────────────────────
console.log('\n@filterbridge/core (CJS)')

const core = require('@filterbridge/core')

assert('core: defineFilters exported', typeof core.defineFilters === 'function')
assert('core: text exported', typeof core.text === 'function')
assert('core: select exported', typeof core.select === 'function')
assert('core: multiSelect exported', typeof core.multiSelect === 'function')
assert('core: boolean exported', typeof core.boolean === 'function')
assert('core: dateRange exported', typeof core.dateRange === 'function')
assert('core: numberRange exported', typeof core.numberRange === 'function')
assert('core: parseFilters exported', typeof core.parseFilters === 'function')
assert('core: toSearchParams exported', typeof core.toSearchParams === 'function')
assert('core: toQueryDto exported', typeof core.toQueryDto === 'function')

const filters = core.defineFilters({
  search: core.text(),
  status: core.select(['pending', 'paid']),
  active: core.boolean(),
  amount: core.numberRange(),
})

const state = core.parseFilters(filters, {
  search: 'test',
  status: 'paid',
  active: 'true',
  amountMin: '50',
})

assert('core: parseFilters text', state.search === 'test')
assert('core: parseFilters select', state.status === 'paid')
assert('core: parseFilters boolean', state.active === true)
assert('core: parseFilters numberRange min', state.amount?.min === 50)

const dto = core.toQueryDto(filters, state)
assert('core: toQueryDto search', dto.search === 'test')

// ──────────────────────────────────────────────
// @filterbridge/browser (CJS)
// ──────────────────────────────────────────────
console.log('\n@filterbridge/browser (CJS)')

const browser = require('@filterbridge/browser')

assert('browser: createFilterUrl exported', typeof browser.createFilterUrl === 'function')
assert('browser: parseFiltersFromUrl exported', typeof browser.parseFiltersFromUrl === 'function')
assert('browser: getFilterParamKeys exported', typeof browser.getFilterParamKeys === 'function')

const url = browser.createFilterUrl(filters, state, { pathname: '/items' })
assert('browser: createFilterUrl returns string', typeof url === 'string')
assert('browser: createFilterUrl has pathname', url.startsWith('/items?'))

// ──────────────────────────────────────────────
// @filterbridge/tanstack (CJS)
// ──────────────────────────────────────────────
console.log('\n@filterbridge/tanstack (CJS)')

const tanstack = require('@filterbridge/tanstack')

assert(
  'tanstack: toTanStackColumnFilters exported',
  typeof tanstack.toTanStackColumnFilters === 'function'
)
assert(
  'tanstack: fromTanStackColumnFilters exported',
  typeof tanstack.fromTanStackColumnFilters === 'function'
)
assert('tanstack: filterBridgeFilterFns exported', typeof tanstack.filterBridgeFilterFns === 'object')

const cf = tanstack.toTanStackColumnFilters(filters, state)
assert('tanstack: toTanStackColumnFilters returns array', Array.isArray(cf))

// ──────────────────────────────────────────────
// @filterbridge/next (CJS)
// ──────────────────────────────────────────────
console.log('\n@filterbridge/next (CJS)')

const next = require('@filterbridge/next')

assert(
  'next: parseNextSearchParams exported',
  typeof next.parseNextSearchParams === 'function'
)
assert(
  'next: createNextFilterHref exported',
  typeof next.createNextFilterHref === 'function'
)

const nextState = next.parseNextSearchParams(filters, { search: 'hello', active: 'false' })
assert('next: parseNextSearchParams search', nextState.search === 'hello')
assert('next: parseNextSearchParams boolean false', nextState.active === false)

// ──────────────────────────────────────────────
// @filterbridge/react (CJS)
// ──────────────────────────────────────────────
console.log('\n@filterbridge/react (CJS)')

const react = require('@filterbridge/react')

assert('react: useFilterBridge exported', typeof react.useFilterBridge === 'function')

// ──────────────────────────────────────────────
// 0.2.0 surface (CJS)
// ──────────────────────────────────────────────
console.log('\n0.2.0 surface (CJS)')

assert(
  'core: getDefaultFilterState exported',
  typeof core.getDefaultFilterState === 'function'
)

const defaulted = core.defineFilters({
  status: core.select(['pending', 'paid', 'failed'], { default: 'pending' }),
})
assert(
  'defaults: a missing param parses back to the default',
  core.parseFilters(defaulted, {}).status === 'pending'
)
assert(
  'defaults: a filter at its default emits no param',
  core.toSearchParams(defaulted, { status: 'pending' }).toString() === ''
)
// The URL may omit a default because parseFilters restores it; the DTO may not,
// because the backend on the other side does not know the schema.
assert(
  'defaults: the DTO of a virgin page carries the default',
  core.toQueryDto(defaulted, core.parseFilters(defaulted, {})).status === 'pending'
)
assert(
  'defaults: the DTO carries the default even from an empty state',
  core.toQueryDto(defaulted, {}).status === 'pending'
)
// See the ESM file: arity was never a usable proxy, and the last trace of it
// broke again in 0.4.0 when `text` gained `key`. This asserts the ADR-002 rule
// and nothing else.
assert(
  'defaults: builders without an enumerable value space produce no default',
  Object.keys(
    core.getDefaultFilterState(
      core.defineFilters({
        search: core.text({ default: 'invoice' }),
        createdAt: core.dateRange({ default: { from: '2026-01-01' } }),
        amount: core.numberRange({ default: { min: 1 } }),
      })
    )
  ).length === 0
)

const tagged = core.defineFilters({ tags: core.multiSelect(['urgent', 'flagged']) })
assert(
  'repeated params: both values survive',
  core.parseFilters(tagged, new URLSearchParams('tags=urgent&tags=flagged')).tags.length === 2
)
assert(
  'non-finite: the DTO always survives JSON.stringify',
  JSON.stringify(core.toQueryDto(filters, { amount: { min: NaN, max: 10 } })) ===
    '{"amount":{"max":10}}'
)

// ──────────────────────────────────────────────
// Custom range keys (0.3.0)
// ──────────────────────────────────────────────
console.log('\ncustom range keys (CJS)')

const browserCjs = require('@filterbridge/browser')
const nextCjs = require('@filterbridge/next')

const customKeyed = core.defineFilters({
  createdAt: core.dateRange({ keys: { from: 'created_after', to: 'created_before' } }),
  amount: core.numberRange({ keys: { min: 'min_cents' } }),
})
const customState = {
  createdAt: { from: '2026-01-01', to: '2026-01-31' },
  amount: { min: 100, max: 500 },
}

assert(
  'keys: toSearchParams writes the override',
  core.toSearchParams(customKeyed, customState).toString() ===
    'created_after=2026-01-01&created_before=2026-01-31&min_cents=100&amountMax=500'
)
assert(
  'keys: parseFilters reads the override',
  JSON.stringify(
    core.parseFilters(customKeyed, core.toSearchParams(customKeyed, customState))
  ) === JSON.stringify(customState)
)
assert(
  'keys: toQueryDto is keyed by filter name, not by the override',
  JSON.stringify(core.toQueryDto(customKeyed, customState)) === JSON.stringify(customState)
)
assert(
  'keys: browser getFilterParamKeys reports the override',
  browserCjs.getFilterParamKeys(customKeyed).join(',') ===
    'created_after,created_before,min_cents,amountMax'
)
assert(
  'keys: next parses the override identically to core',
  JSON.stringify(
    nextCjs.parseNextSearchParams(customKeyed, new URLSearchParams('created_after=2026-01-01'))
  ) ===
    JSON.stringify(
      core.parseFilters(customKeyed, new URLSearchParams('created_after=2026-01-01'))
    )
)
assert(
  'keys: defineFilters throws on a duplicate param key',
  (() => {
    try {
      core.defineFilters({ createdAtFrom: core.text(), createdAt: core.dateRange() })
      return false
    } catch {
      return true
    }
  })()
)

// ──────────────────────────────────────────────
// Schema validation throws (0.3.x)
// ──────────────────────────────────────────────
// See the ESM file for why these are asserted against the tarball.
console.log('\nschema validation (CJS)')

/** Runs `fn`, and answers whether it threw a message containing `needle`. */
function throwsWith(fn, needle) {
  try {
    fn()
    return false
  } catch (err) {
    return String(err.message).includes(needle)
  }
}

assert(
  'validation: a keys side the builder does not have is rejected',
  throwsWith(() => core.dateRange({ keys: { form: 'created_after' } }), 'has no side')
)
assert(
  'validation: numberRange rejects a dateRange side',
  throwsWith(() => core.numberRange({ keys: { from: 'x' } }), 'has no side')
)
assert(
  'validation: a padded key is rejected rather than trimmed',
  throwsWith(
    () => core.dateRange({ keys: { from: ' created_after' } }),
    'leading or trailing whitespace'
  )
)
assert(
  'validation: an empty key is rejected',
  throwsWith(() => core.numberRange({ keys: { min: '' } }), 'non-empty string')
)
assert(
  'validation: a range colliding with itself names both sides',
  throwsWith(
    () => core.defineFilters({ createdAt: core.dateRange({ keys: { from: 'when', to: 'when' } }) }),
    'keys.from and keys.to'
  )
)
assert(
  'validation: an unknown filter kind is rejected, not guessed',
  throwsWith(
    () => browserCjs.getFilterParamKeys({ mystery: { _kind: 'somethingElse' } }),
    'unsupported filter kind'
  )
)

// --------------------------------------------
// Custom URL param keys on the scalar filters (0.4.0)
// --------------------------------------------
console.log('\n@filterbridge/core: scalar key overrides (CJS)')

const renamedCjs = core.defineFilters({
  search: core.text({ key: 'q' }),
  status: core.select(['pending', 'paid'], { key: 'st', default: 'paid' }),
  archived: core.boolean({ key: 'is_archived' }),
})

assert('core: scalarParamKey exported', typeof core.scalarParamKey === 'function')
assert(
  'core: scalarParamKey honours the override',
  core.scalarParamKey('search', core.text({ key: 'q' })) === 'q'
)
assert(
  'core: parseFilters reads the overridden key',
  core.parseFilters(renamedCjs, { q: 'invoice', is_archived: 'true' }).search === 'invoice'
)
assert(
  'core: the filter name is not an alias for the overridden key',
  core.parseFilters(renamedCjs, { search: 'invoice' }).search === undefined
)
assert(
  'core: toSearchParams writes the overridden key',
  core.toSearchParams(renamedCjs, { search: 'invoice' }).get('q') === 'invoice'
)
assert(
  'core: toQueryDto stays keyed by filter name',
  core.toQueryDto(renamedCjs, { search: 'invoice' }).search === 'invoice'
)
assert(
  'browser: getFilterParamKeys reports the overrides',
  browserCjs.getFilterParamKeys(renamedCjs).join(',') === 'q,st,is_archived'
)
assert(
  'next: normalizeNextSearchParams follows the override',
  nextCjs.parseNextSearchParams(renamedCjs, { q: 'invoice' }).search === 'invoice'
)
assert(
  'validation: a padded scalar key is rejected rather than trimmed',
  throwsWith(() => core.text({ key: ' q' }), 'leading or trailing whitespace')
)
assert(
  'validation: a scalar key colliding with another filter throws',
  throwsWith(
    () => core.defineFilters({ search: core.text({ key: 'q' }), q: core.text() }),
    'both use the URL param'
  )
)

const browserReact = require('@filterbridge/browser/react')
assert(
  'browser/react: usePopstateSync exported',
  typeof browserReact.usePopstateSync === 'function'
)

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`)
console.log(`CJS smoke test: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  process.exit(1)
}
