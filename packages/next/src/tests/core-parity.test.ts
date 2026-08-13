import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
} from '@filterbridge/core'
import { parseNextSearchParams } from '../parse-next-search-params'

/**
 * A Next.js app parses on the server with @filterbridge/next and re-parses on the
 * client with @filterbridge/core. Both must produce identical state for the same
 * URL, including repeated query params, or hydration mismatches.
 */

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'recurring', 'overdue'] as const),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

const urls = [
  'tags=urgent&tags=recurring',
  'tags=urgent,recurring&tags=overdue',
  'tags=urgent&tags=nope',
  'tags=nope&tags=alsonope',
  'search=a&search=b',
  'status=paid&status=failed',
  'archived=true&archived=false',
  'createdAtFrom=2026-01-01&createdAtFrom=2026-02-01&createdAtTo=2026-03-01',
  'amountMin=100&amountMin=200&amountMax=500',
  'search=invoice&status=paid&tags=urgent,overdue&archived=false&amountMin=10',
]

describe('core and next produce identical state', () => {
  it.each(urls)('%s', (query) => {
    const fromCore = parseFilters(filters, new URLSearchParams(query))
    const fromNext = parseNextSearchParams(filters, new URLSearchParams(query))
    expect(fromNext).toEqual(fromCore)
  })

  it('agrees on a repeated multiSelect param', () => {
    const query = 'tags=urgent&tags=recurring'
    expect(parseFilters(filters, new URLSearchParams(query))).toMatchObject({
      tags: ['urgent', 'recurring'],
    })
    expect(parseNextSearchParams(filters, new URLSearchParams(query))).toMatchObject({
      tags: ['urgent', 'recurring'],
    })
  })

  it('agrees when Next.js supplies the plain-record array form', () => {
    const fromNext = parseNextSearchParams(filters, { tags: ['urgent', 'recurring'] })
    const fromCore = parseFilters(filters, new URLSearchParams('tags=urgent&tags=recurring'))
    expect(fromNext).toEqual(fromCore)
  })
})

/** Deterministic LCG: the property must fail on the same case every run. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * Deliberately duplicated from `@filterbridge/core`'s round-trip test rather
 * than shared: the point of this file is that the two packages agree without
 * one of them borrowing the other's test fixtures.
 */
const paramPools: Array<readonly [string, readonly string[]]> = [
  ['search', ['invoice', '', '   ', 'a,b']],
  ['status', ['paid', 'pending', 'bogus', '']],
  ['tags', ['urgent', 'urgent,recurring', 'zzz', 'urgent,zzz', '']],
  ['archived', ['true', '1', 'false', '0', 'yes', '']],
  ['createdAtFrom', ['2026-01-01', '', '   ']],
  ['createdAtTo', ['2026-01-31', '']],
  ['amountMin', ['100', '-5.5', 'abc', 'NaN', 'Infinity', '']],
  ['amountMax', ['500', '0', '']],
  ['page', ['2']],
]

describe('core and next agree on generated query strings', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('holds for 300 generated URLs, including repeated and invalid params', () => {
    const random = makeRandom(0x0dd)

    for (let i = 0; i < 300; i++) {
      const params = new URLSearchParams()

      for (const [key, pool] of paramPools) {
        const roll = random()
        if (roll < 0.5) continue
        params.append(key, pool[Math.floor(random() * pool.length)])
        if (roll > 0.85) params.append(key, pool[Math.floor(random() * pool.length)])
      }

      const message = `query: ${params.toString()}`
      const fromCore = parseFilters(filters, params)

      // Both input shapes Next.js can hand a page: the ReadonlyURLSearchParams
      // of a client component and the plain record of a server component.
      expect(parseNextSearchParams(filters, params), message).toEqual(fromCore)
      expect(parseNextSearchParams(filters, recordFrom(params)), message).toEqual(fromCore)
    }
  })
})

/**
 * Defaults live entirely in `@filterbridge/core` — `@filterbridge/next` only
 * normalizes the input shape and delegates. That is exactly why parity has to
 * be asserted rather than assumed: `normalizeNextSearchParams` decides which
 * keys reach `parseFilters` at all, so a key it drops silently becomes "absent"
 * and comes back as the default instead of as the value the URL carried.
 */
const defaulted = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const, { default: 'pending' }),
  tags: multiSelect(['urgent', 'recurring', 'overdue'] as const, { default: ['urgent'] }),
  archived: boolean({ default: false }),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('core and next agree on a schema with defaults', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('agrees on an empty query — both fill in every default', () => {
    const fromCore = parseFilters(defaulted, new URLSearchParams(''))
    expect(fromCore).toEqual({
      status: 'pending',
      tags: ['urgent'],
      archived: false,
    })
    expect(parseNextSearchParams(defaulted, new URLSearchParams(''))).toEqual(fromCore)
    expect(parseNextSearchParams(defaulted, {})).toEqual(fromCore)
    expect(parseNextSearchParams(defaulted, undefined)).toEqual(fromCore)
  })

  it.each(urls)('%s', (query) => {
    const fromCore = parseFilters(defaulted, new URLSearchParams(query))
    expect(parseNextSearchParams(defaulted, new URLSearchParams(query))).toEqual(fromCore)
    expect(parseNextSearchParams(defaulted, recordFrom(new URLSearchParams(query)))).toEqual(
      fromCore
    )
  })

  it('holds for 300 generated URLs', () => {
    const random = makeRandom(0x0dd)

    for (let i = 0; i < 300; i++) {
      const params = new URLSearchParams()

      for (const [key, pool] of paramPools) {
        const roll = random()
        if (roll < 0.5) continue
        params.append(key, pool[Math.floor(random() * pool.length)])
        if (roll > 0.85) params.append(key, pool[Math.floor(random() * pool.length)])
      }

      const message = `query: ${params.toString()}`
      const fromCore = parseFilters(defaulted, params)

      expect(parseNextSearchParams(defaulted, params), message).toEqual(fromCore)
      expect(parseNextSearchParams(defaulted, recordFrom(params)), message).toEqual(fromCore)
    }
  })
})

/** The `searchParams` record shape Next.js passes to a server component. */
function recordFrom(params: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {}
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)
    record[key] = all.length > 1 ? all : all[0]
  }
  return record
}
