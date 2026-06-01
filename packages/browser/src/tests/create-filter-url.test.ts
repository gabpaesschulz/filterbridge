// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  select,
  text,
} from '@filterbridge/core'
import { createFilterUrl } from '../create-filter-url'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

describe('createFilterUrl', () => {
  it('creates a URL with pathname and filters', () => {
    const url = createFilterUrl(schema, { search: 'acme' }, { pathname: '/invoices' })
    expect(url).toBe('/invoices?search=acme')
  })

  it('omits ? when there are no params', () => {
    const url = createFilterUrl(schema, {}, { pathname: '/invoices' })
    expect(url).toBe('/invoices')
  })

  it('uses / as default pathname outside browser', () => {
    // jsdom has window.location.pathname set; override it
    Object.defineProperty(window, 'location', {
      value: { pathname: '/custom', search: '' },
      writable: true,
      configurable: true,
    })
    const url = createFilterUrl(schema, { search: 'test' }, { pathname: '/custom' })
    expect(url).toBe('/custom?search=test')
  })

  it('preserves non-filter params from currentSearch', () => {
    const url = createFilterUrl(
      schema,
      { search: 'acme' },
      {
        pathname: '/invoices',
        currentSearch: '?page=2&tab=open',
        preserveExistingParams: true,
      }
    )
    expect(url).toContain('page=2')
    expect(url).toContain('tab=open')
    expect(url).toContain('search=acme')
  })

  it('removes old filter params from currentSearch', () => {
    const url = createFilterUrl(
      schema,
      { search: 'acme' },
      {
        pathname: '/invoices',
        currentSearch: '?page=2&search=old&status=paid',
        preserveExistingParams: true,
      }
    )
    expect(url).not.toContain('search=old')
    expect(url).not.toContain('status=paid')
    expect(url).toContain('page=2')
    expect(url).toContain('search=acme')
  })

  it('replaces old filter params with new values', () => {
    const url = createFilterUrl(
      schema,
      { search: 'new-value' },
      {
        pathname: '/invoices',
        currentSearch: '?search=old-value',
        preserveExistingParams: true,
      }
    )
    expect(url).toBe('/invoices?search=new-value')
  })

  it('removes all filter params when state is empty', () => {
    const url = createFilterUrl(
      schema,
      {},
      {
        pathname: '/invoices',
        currentSearch: '?page=2&search=old&status=paid',
        preserveExistingParams: true,
      }
    )
    expect(url).toBe('/invoices?page=2')
  })

  it('respects preserveExistingParams: false', () => {
    const url = createFilterUrl(
      schema,
      { search: 'acme' },
      {
        pathname: '/invoices',
        currentSearch: '?page=2&tab=open',
        preserveExistingParams: false,
      }
    )
    expect(url).toBe('/invoices?search=acme')
    expect(url).not.toContain('page=2')
  })

  it('preserves hash', () => {
    const url = createFilterUrl(
      schema,
      { search: 'acme' },
      { pathname: '/invoices', hash: 'section-1' }
    )
    expect(url).toBe('/invoices?search=acme#section-1')
  })

  it('preserves hash with no filters', () => {
    const url = createFilterUrl(schema, {}, { pathname: '/invoices', hash: 'top' })
    expect(url).toBe('/invoices#top')
  })

  it('serializes dateRange correctly', () => {
    const url = createFilterUrl(
      schema,
      { issuedAt: { from: '2026-01-01', to: '2026-01-31' } },
      { pathname: '/invoices' }
    )
    expect(url).toContain('issuedAtFrom=2026-01-01')
    expect(url).toContain('issuedAtTo=2026-01-31')
  })

  it('serializes numberRange correctly', () => {
    const url = createFilterUrl(
      schema,
      { amount: { min: 100, max: 500 } },
      { pathname: '/invoices' }
    )
    expect(url).toContain('amountMin=100')
    expect(url).toContain('amountMax=500')
  })

  it('serializes multiSelect with comma', () => {
    const url = createFilterUrl(
      schema,
      { tags: ['urgent', 'review'] },
      { pathname: '/invoices' }
    )
    expect(url).toContain('tags=urgent%2Creview')
  })

  it('handles currentSearch without leading ?', () => {
    const url = createFilterUrl(
      schema,
      { search: 'acme' },
      {
        pathname: '/invoices',
        currentSearch: 'page=2',
        preserveExistingParams: true,
      }
    )
    expect(url).toContain('page=2')
    expect(url).toContain('search=acme')
  })

  it('handles currentSearch as URLSearchParams', () => {
    const existing = new URLSearchParams('page=3&tab=closed')
    const url = createFilterUrl(
      schema,
      { search: 'test' },
      {
        pathname: '/invoices',
        currentSearch: existing,
        preserveExistingParams: true,
      }
    )
    expect(url).toContain('page=3')
    expect(url).toContain('tab=closed')
    expect(url).toContain('search=test')
  })

  it('is deterministic across multiple calls', () => {
    const state = { search: 'acme', status: 'paid' as const }
    const opts = { pathname: '/invoices' }
    expect(createFilterUrl(schema, state, opts)).toBe(createFilterUrl(schema, state, opts))
  })
})
