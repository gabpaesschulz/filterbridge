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
import { getFilterParamKeys } from '../filter-param-keys'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

describe('getFilterParamKeys', () => {
  it('returns simple keys for text, select, multiSelect, boolean', () => {
    const keys = getFilterParamKeys(
      defineFilters({ search: text(), status: select(['a'] as const), archived: boolean() })
    )
    expect(keys).toEqual(['search', 'status', 'archived'])
  })

  it('returns From/To keys for dateRange', () => {
    const keys = getFilterParamKeys(defineFilters({ issuedAt: dateRange() }))
    expect(keys).toEqual(['issuedAtFrom', 'issuedAtTo'])
  })

  it('returns Min/Max keys for numberRange', () => {
    const keys = getFilterParamKeys(defineFilters({ amount: numberRange() }))
    expect(keys).toEqual(['amountMin', 'amountMax'])
  })

  it('returns all keys in schema order', () => {
    const keys = getFilterParamKeys(schema)
    expect(keys).toEqual([
      'search',
      'status',
      'tags',
      'archived',
      'issuedAtFrom',
      'issuedAtTo',
      'amountMin',
      'amountMax',
    ])
  })

  it('returns deterministic order on repeated calls', () => {
    expect(getFilterParamKeys(schema)).toEqual(getFilterParamKeys(schema))
  })

  it('returns empty array for empty schema', () => {
    expect(getFilterParamKeys(defineFilters({}))).toEqual([])
  })

  /**
   * The export moved into `@filterbridge/core` in `0.3.0` and is re-exported
   * here unchanged. What matters for this package is that it reports overrides:
   * `createFilterUrl` strips exactly the keys this returns before writing the
   * new state, so a custom key it failed to report would sit in the URL
   * forever, and the next parse would read a value the user had cleared.
   */
  it('reports custom range keys', () => {
    const keys = getFilterParamKeys(
      defineFilters({
        issuedAt: dateRange({ keys: { from: 'issued_after', to: 'issued_before' } }),
        amount: numberRange({ keys: { min: 'min_cents' } }),
      })
    )
    expect(keys).toEqual(['issued_after', 'issued_before', 'min_cents', 'amountMax'])
  })

  it('strips a stale custom key from the URL', () => {
    const schema = defineFilters({
      issuedAt: dateRange({ keys: { from: 'issued_after', to: 'issued_before' } }),
    })
    const url = createFilterUrl(
      schema,
      {},
      { pathname: '/invoices', currentSearch: 'issued_after=2026-01-01&tab=open' }
    )
    expect(url).toBe('/invoices?tab=open')
  })
})

describe('custom scalar keys', () => {
  const renamed = defineFilters({
    search: text({ key: 'q' }),
    status: select(['pending', 'paid'] as const, { key: 'st' }),
    tags: multiSelect(['urgent', 'review'] as const, { key: 'labels' }),
    archived: boolean({ key: 'is_archived' }),
  })

  it('reports them', () => {
    expect(getFilterParamKeys(renamed)).toEqual(['q', 'st', 'labels', 'is_archived'])
  })

  it('strips a stale one from the URL', () => {
    // The reason getFilterParamKeys has to know about the override: it is what
    // createFilterUrl removes before writing the new state. A key it failed to
    // report would sit in the URL forever, and the next parse would read back a
    // value the user had cleared.
    const url = createFilterUrl(
      renamed,
      {},
      { pathname: '/invoices', currentSearch: 'q=invoice&is_archived=true&tab=open' }
    )
    expect(url).toBe('/invoices?tab=open')
  })

  it('writes state to the overridden key', () => {
    const url = createFilterUrl(renamed, { search: 'invoice', archived: true }, { pathname: '/i' })
    expect(url).toBe('/i?q=invoice&is_archived=true')
  })

  it('leaves a param matching the filter name alone', () => {
    // `search` is not this schema's param any more, so it is somebody else's.
    const url = createFilterUrl(
      renamed,
      { search: 'invoice' },
      { pathname: '/i', currentSearch: 'search=stale' }
    )
    expect(url).toBe('/i?search=stale&q=invoice')
  })
})
