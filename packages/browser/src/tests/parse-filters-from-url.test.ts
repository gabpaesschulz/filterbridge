// @vitest-environment jsdom
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  select,
  text,
} from '@filterbridge/core'
import { parseFiltersFromUrl } from '../parse-filters-from-url'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

describe('parseFiltersFromUrl', () => {
  it('parses a query string with leading ?', () => {
    const state = parseFiltersFromUrl(schema, '?search=acme&status=paid')
    expect(state.search).toBe('acme')
    expect(state.status).toBe('paid')
  })

  it('parses a query string without leading ?', () => {
    const state = parseFiltersFromUrl(schema, 'search=acme&status=pending')
    expect(state.search).toBe('acme')
    expect(state.status).toBe('pending')
  })

  it('parses a URL object', () => {
    const url = new URL('https://example.com/invoices?search=acme&archived=true')
    const state = parseFiltersFromUrl(schema, url)
    expect(state.search).toBe('acme')
    expect(state.archived).toBe(true)
  })

  it('parses URLSearchParams', () => {
    const params = new URLSearchParams('search=acme&status=failed')
    const state = parseFiltersFromUrl(schema, params)
    expect(state.search).toBe('acme')
    expect(state.status).toBe('failed')
  })

  it('parses a location-like object', () => {
    const state = parseFiltersFromUrl(schema, { search: '?search=hello&archived=false' })
    expect(state.search).toBe('hello')
    expect(state.archived).toBe(false)
  })

  it('parses a location-like object without leading ?', () => {
    const state = parseFiltersFromUrl(schema, { search: 'search=hello' })
    expect(state.search).toBe('hello')
  })

  it('returns {} for empty string input', () => {
    const state = parseFiltersFromUrl(schema, '')
    expect(state).toEqual({})
  })

  it('returns {} for empty URLSearchParams', () => {
    const state = parseFiltersFromUrl(schema, new URLSearchParams())
    expect(state).toEqual({})
  })

  it('ignores params not in the schema', () => {
    const state = parseFiltersFromUrl(schema, '?search=acme&page=2&sort=desc')
    expect(state.search).toBe('acme')
    expect(Object.keys(state)).not.toContain('page')
    expect(Object.keys(state)).not.toContain('sort')
  })

  it('parses multiSelect comma-separated values', () => {
    const state = parseFiltersFromUrl(schema, '?tags=urgent,review')
    expect(state.tags).toEqual(['urgent', 'review'])
  })

  it('parses dateRange keys', () => {
    const state = parseFiltersFromUrl(schema, '?issuedAtFrom=2026-01-01&issuedAtTo=2026-01-31')
    expect(state.issuedAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('parses numberRange keys', () => {
    const state = parseFiltersFromUrl(schema, '?amountMin=100&amountMax=500')
    expect(state.amount).toEqual({ min: 100, max: 500 })
  })

  it('reads from window.location.search when no input is provided', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?search=from-url' },
      writable: true,
      configurable: true,
    })
    const state = parseFiltersFromUrl(schema)
    expect(state.search).toBe('from-url')
  })

  it('infers correct types', () => {
    const state = parseFiltersFromUrl(schema, '?status=paid')
    expectTypeOf(state.status).toEqualTypeOf<'pending' | 'paid' | 'failed' | undefined>()
    expectTypeOf(state.search).toEqualTypeOf<string | undefined>()
    expectTypeOf(state.archived).toEqualTypeOf<boolean | undefined>()
  })
})
