// ESM smoke test — validates that all FilterBridge packages are importable
// and that basic runtime functionality works correctly.

import {
  defineFilters,
  text,
  select,
  multiSelect,
  boolean,
  dateRange,
  numberRange,
  parseFilters,
  toSearchParams,
  toQueryDto,
  getDefaultFilterState,
} from '@filterbridge/core'

import { createFilterUrl, parseFiltersFromUrl, getFilterParamKeys } from '@filterbridge/browser'

import {
  toTanStackColumnFilters,
  fromTanStackColumnFilters,
  filterBridgeFilterFns,
} from '@filterbridge/tanstack'

import {
  parseNextSearchParams,
  createNextFilterHref,
  normalizeNextSearchParams,
} from '@filterbridge/next'

import { useFilterBridge } from '@filterbridge/react'

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
// @filterbridge/core
// ──────────────────────────────────────────────
console.log('\n@filterbridge/core')

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'flagged', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

const state = parseFilters(filters, {
  search: 'invoice',
  status: 'paid',
  tags: 'urgent,flagged',
  active: 'true',
  createdAtFrom: '2026-01-01',
  createdAtTo: '2026-01-31',
  amountMin: '100',
  amountMax: '500',
})

assert('parseFilters: text', state.search === 'invoice')
assert('parseFilters: select', state.status === 'paid')
assert('parseFilters: multiSelect', Array.isArray(state.tags) && state.tags.length === 2)
assert('parseFilters: boolean', state.active === true)
assert('parseFilters: dateRange from', state.createdAt?.from === '2026-01-01')
assert('parseFilters: dateRange to', state.createdAt?.to === '2026-01-31')
assert('parseFilters: numberRange min', state.amount?.min === 100)
assert('parseFilters: numberRange max', state.amount?.max === 500)

const params = toSearchParams(filters, state)
assert('toSearchParams: returns URLSearchParams', params instanceof URLSearchParams)
assert('toSearchParams: search', params.get('search') === 'invoice')
assert('toSearchParams: status', params.get('status') === 'paid')
assert('toSearchParams: active', params.get('active') === 'true')
assert('toSearchParams: createdAtFrom', params.get('createdAtFrom') === '2026-01-01')
assert('toSearchParams: amountMin', params.get('amountMin') === '100')

const dto = toQueryDto(filters, state)
assert('toQueryDto: search present', dto.search === 'invoice')
assert('toQueryDto: status present', dto.status === 'paid')
assert('toQueryDto: tags is array', Array.isArray(dto.tags))
assert('toQueryDto: createdAt object', typeof dto.createdAt === 'object')
assert('toQueryDto: amount object', typeof dto.amount === 'object')

// ──────────────────────────────────────────────
// @filterbridge/browser
// ──────────────────────────────────────────────
console.log('\n@filterbridge/browser')

const keys = getFilterParamKeys(filters)
assert('getFilterParamKeys: returns array', Array.isArray(keys))
assert('getFilterParamKeys: search included', keys.includes('search'))
assert('getFilterParamKeys: createdAtFrom included', keys.includes('createdAtFrom'))

const url = createFilterUrl(filters, state, { pathname: '/invoices' })
assert('createFilterUrl: returns string', typeof url === 'string')
assert('createFilterUrl: starts with pathname', url.startsWith('/invoices?'))
assert('createFilterUrl: contains search', url.includes('search=invoice'))

const parsedFromUrl = parseFiltersFromUrl(filters, '?search=hello&status=pending')
assert('parseFiltersFromUrl: search', parsedFromUrl.search === 'hello')
assert('parseFiltersFromUrl: status', parsedFromUrl.status === 'pending')

// ──────────────────────────────────────────────
// @filterbridge/tanstack
// ──────────────────────────────────────────────
console.log('\n@filterbridge/tanstack')

const columnFilters = toTanStackColumnFilters(filters, state)
assert('toTanStackColumnFilters: returns array', Array.isArray(columnFilters))
assert('toTanStackColumnFilters: has entries', columnFilters.length > 0)

const roundtripped = fromTanStackColumnFilters(filters, columnFilters)
assert('fromTanStackColumnFilters: search roundtrip', roundtripped.search === 'invoice')
assert('fromTanStackColumnFilters: status roundtrip', roundtripped.status === 'paid')

assert('filterBridgeFilterFns.text: is function', typeof filterBridgeFilterFns.text === 'function')
assert(
  'filterBridgeFilterFns.multiSelect: is function',
  typeof filterBridgeFilterFns.multiSelect === 'function'
)

// ──────────────────────────────────────────────
// @filterbridge/next
// ──────────────────────────────────────────────
console.log('\n@filterbridge/next')

const nextState = parseNextSearchParams(filters, { search: 'acme', status: 'paid' })
assert('parseNextSearchParams: search', nextState.search === 'acme')
assert('parseNextSearchParams: status', nextState.status === 'paid')

const href = createNextFilterHref(filters, state, { pathname: '/orders' })
assert('createNextFilterHref: returns string', typeof href === 'string')
assert('createNextFilterHref: pathname', href.startsWith('/orders?'))

const normalized = normalizeNextSearchParams(filters, { search: 'foo', status: 'pending' })
assert('normalizeNextSearchParams: search', normalized.search === 'foo')

// ──────────────────────────────────────────────
// @filterbridge/react
// ──────────────────────────────────────────────
console.log('\n@filterbridge/react')
assert('useFilterBridge: exported as function', typeof useFilterBridge === 'function')

// ──────────────────────────────────────────────
// 0.2.0 surface
// ──────────────────────────────────────────────
console.log('\n0.2.0 surface')

const defaulted = defineFilters({
  status: select(['pending', 'paid', 'failed'], { default: 'pending' }),
  amount: numberRange(),
})

assert('getDefaultFilterState: exported', typeof getDefaultFilterState === 'function')
assert(
  'getDefaultFilterState: returns the declared defaults',
  getDefaultFilterState(defaulted).status === 'pending'
)
assert(
  'defaults: a filter at its default emits no param',
  toSearchParams(defaulted, { status: 'pending' }).toString() === ''
)
assert(
  'defaults: a missing param parses back to the default',
  parseFilters(defaulted, new URLSearchParams('')).status === 'pending'
)

// The published contract this pins: omitting a default from the URL is safe
// because parseFilters puts it back, but the DTO leaves for a backend that
// cannot know the schema, so it must carry the default explicitly. A virgin
// page that renders "pending" must not tell the backend "no filter".
const virginDto = toQueryDto(defaulted, parseFilters(defaulted, new URLSearchParams('')))
assert('defaults: the DTO of a virgin page carries the default', virginDto.status === 'pending')
assert(
  'defaults: the DTO carries the default even from an empty state',
  toQueryDto(defaulted, {}).status === 'pending'
)
// Was an arity check until 0.3.0, when `dateRange` and `numberRange` gained a
// `keys` option and stopped taking zero arguments. Arity was only ever a proxy
// for the ADR-002 rule; this asserts the rule itself, which is that neither
// builder produces a default no matter what it is handed.
assert(
  'defaults: builders without an enumerable value space produce no default',
  text.length === 0 &&
    Object.keys(
      getDefaultFilterState(
        defineFilters({
          search: text(),
          createdAt: dateRange({ default: { from: '2026-01-01' } }),
          amount: numberRange({ default: { min: 1 } }),
        })
      )
    ).length === 0
)

const repeated = parseFilters(filters, new URLSearchParams('tags=urgent&tags=flagged'))
assert('repeated params: both values survive', repeated.tags?.length === 2)

assert(
  'non-finite: Infinity is not parsed out of a URL',
  parseFilters(filters, new URLSearchParams('amountMin=Infinity')).amount === undefined
)
assert(
  'non-finite: NaN never reaches the URL',
  toSearchParams(filters, { amount: { min: NaN } }).toString() === ''
)
assert(
  'non-finite: the DTO always survives JSON.stringify',
  JSON.stringify(toQueryDto(filters, { amount: { min: NaN, max: 10 } })) ===
    '{"amount":{"max":10}}'
)

const warn = console.warn
console.warn = () => {}
assert(
  'schema validation: a forbidden select value never reaches the URL',
  toSearchParams(filters, { status: 'bogus' }).toString() === ''
)
assert(
  'schema validation: a forbidden select value never reaches the DTO',
  JSON.stringify(toQueryDto(filters, { status: 'bogus' })) === '{}'
)
console.warn = warn

assert(
  'empty values: whitespace-only text is omitted',
  toSearchParams(filters, { search: '   ' }).toString() === ''
)

// ──────────────────────────────────────────────
// Custom range keys (0.3.0)
// ──────────────────────────────────────────────
console.log('\ncustom range keys (ESM)')

const customKeyed = defineFilters({
  createdAt: dateRange({ keys: { from: 'created_after', to: 'created_before' } }),
  amount: numberRange({ keys: { min: 'min_cents' } }),
})
const customState = {
  createdAt: { from: '2026-01-01', to: '2026-01-31' },
  amount: { min: 100, max: 500 },
}

assert(
  'keys: toSearchParams writes the override',
  toSearchParams(customKeyed, customState).toString() ===
    'created_after=2026-01-01&created_before=2026-01-31&min_cents=100&amountMax=500'
)
assert(
  'keys: parseFilters reads the override',
  JSON.stringify(parseFilters(customKeyed, toSearchParams(customKeyed, customState))) ===
    JSON.stringify(customState)
)
assert(
  'keys: toQueryDto is keyed by filter name, not by the override',
  JSON.stringify(toQueryDto(customKeyed, customState)) === JSON.stringify(customState)
)
assert(
  'keys: browser getFilterParamKeys reports the override',
  getFilterParamKeys(customKeyed).join(',') ===
    'created_after,created_before,min_cents,amountMax'
)
assert(
  'keys: next parses the override identically to core',
  JSON.stringify(
    parseNextSearchParams(customKeyed, new URLSearchParams('created_after=2026-01-01'))
  ) === JSON.stringify(parseFilters(customKeyed, new URLSearchParams('created_after=2026-01-01')))
)
assert(
  'keys: defineFilters throws on a duplicate param key',
  (() => {
    try {
      defineFilters({ createdAtFrom: text(), createdAt: dateRange() })
      return false
    } catch {
      return true
    }
  })()
)

// ──────────────────────────────────────────────
// Schema validation throws (0.3.x)
// ──────────────────────────────────────────────
// Each of these is a mistake that used to pass in silence and surface later as
// a filter that quietly did nothing. They are asserted here, against the packed
// tarball, because they are the one place core throws: a bundler that dropped
// the check, or a build that mangled the message, is invisible to the unit
// suite which imports source.
console.log('\nschema validation (ESM)')

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
  throwsWith(() => dateRange({ keys: { form: 'created_after' } }), 'has no side')
)
assert(
  'validation: numberRange rejects a dateRange side',
  throwsWith(() => numberRange({ keys: { from: 'x' } }), 'has no side')
)
assert(
  'validation: a padded key is rejected rather than trimmed',
  throwsWith(
    () => dateRange({ keys: { from: ' created_after' } }),
    'leading or trailing whitespace'
  )
)
assert(
  'validation: an empty key is rejected',
  throwsWith(() => numberRange({ keys: { min: '' } }), 'non-empty string')
)
assert(
  'validation: a range colliding with itself names both sides',
  throwsWith(
    () => defineFilters({ createdAt: dateRange({ keys: { from: 'when', to: 'when' } }) }),
    'keys.from and keys.to'
  )
)
assert(
  'validation: an unknown filter kind is rejected, not guessed',
  throwsWith(
    () => getFilterParamKeys({ mystery: { _kind: 'somethingElse' } }),
    'unsupported filter kind'
  )
)

// The optional-React subpath. The root entry above imported without React, so
// reaching this line at all is half the assertion.
const { usePopstateSync } = await import('@filterbridge/browser/react')
assert('browser/react: usePopstateSync exported', typeof usePopstateSync === 'function')

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`)
console.log(`ESM smoke test: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  process.exit(1)
}
