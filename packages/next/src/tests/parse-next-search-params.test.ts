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
import type { InferFilterState } from '@filterbridge/core'
import { parseNextSearchParams, parseNextSearchParamsAsync } from '../parse-next-search-params'

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'recurring', 'overdue'] as const),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('parseNextSearchParams', () => {
  it('parses text filter', () => {
    const state = parseNextSearchParams(filters, { search: 'acme' })
    expect(state.search).toBe('acme')
  })

  it('parses valid select value', () => {
    const state = parseNextSearchParams(filters, { status: 'paid' })
    expect(state.status).toBe('paid')
  })

  it('removes invalid select value', () => {
    const state = parseNextSearchParams(filters, { status: 'invalid' })
    expect(state.status).toBeUndefined()
  })

  it('parses multiSelect from array', () => {
    const state = parseNextSearchParams(filters, { tags: ['urgent', 'recurring'] })
    expect(state.tags).toEqual(['urgent', 'recurring'])
  })

  it('parses multiSelect from CSV string', () => {
    const state = parseNextSearchParams(filters, { tags: 'urgent,recurring' })
    expect(state.tags).toEqual(['urgent', 'recurring'])
  })

  it('removes invalid multiSelect values', () => {
    const state = parseNextSearchParams(filters, { tags: ['urgent', 'invalid'] })
    expect(state.tags).toEqual(['urgent'])
  })

  it('parses boolean true', () => {
    const state = parseNextSearchParams(filters, { archived: 'true' })
    expect(state.archived).toBe(true)
  })

  it('parses boolean false', () => {
    const state = parseNextSearchParams(filters, { archived: 'false' })
    expect(state.archived).toBe(false)
  })

  it('parses boolean 1', () => {
    const state = parseNextSearchParams(filters, { archived: '1' })
    expect(state.archived).toBe(true)
  })

  it('removes invalid boolean value', () => {
    const state = parseNextSearchParams(filters, { archived: 'yes' })
    expect(state.archived).toBeUndefined()
  })

  it('parses dateRange from/to', () => {
    const state = parseNextSearchParams(filters, {
      createdAtFrom: '2026-01-01',
      createdAtTo: '2026-01-31',
    })
    expect(state.createdAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('parses partial dateRange (from only)', () => {
    const state = parseNextSearchParams(filters, { createdAtFrom: '2026-01-01' })
    expect(state.createdAt).toEqual({ from: '2026-01-01' })
  })

  it('parses numberRange min/max', () => {
    const state = parseNextSearchParams(filters, {
      amountMin: '100',
      amountMax: '500',
    })
    expect(state.amount).toEqual({ min: 100, max: 500 })
  })

  it('removes invalid numberRange values', () => {
    const state = parseNextSearchParams(filters, {
      amountMin: 'notanumber',
      amountMax: '500',
    })
    expect(state.amount).toEqual({ max: 500 })
  })

  it('returns empty state for undefined input', () => {
    const state = parseNextSearchParams(filters)
    expect(state).toEqual({})
  })

  it('returns empty state for null input', () => {
    const state = parseNextSearchParams(filters, null)
    expect(state).toEqual({})
  })

  it('ignores non-schema params', () => {
    const state = parseNextSearchParams(filters, {
      search: 'acme',
      page: '2',
      tab: 'open',
    })
    expect(state).toEqual({ search: 'acme' })
    expect(state).not.toHaveProperty('page')
    expect(state).not.toHaveProperty('tab')
  })

  it('accepts URLSearchParams', () => {
    const sp = new URLSearchParams('search=acme&status=paid')
    const state = parseNextSearchParams(filters, sp)
    expect(state.search).toBe('acme')
    expect(state.status).toBe('paid')
  })

  it('infers correct type for select filter', () => {
    const simpleFilters = defineFilters({
      status: select(['pending', 'paid'] as const),
    })
    const state = parseNextSearchParams(simpleFilters, { status: 'paid' })
    expectTypeOf(state.status).toEqualTypeOf<'pending' | 'paid' | undefined>()
  })

  it('infers correct type for multiSelect filter', () => {
    const simpleFilters = defineFilters({
      tags: multiSelect(['a', 'b'] as const),
    })
    const state = parseNextSearchParams(simpleFilters, { tags: ['a', 'b'] })
    expectTypeOf(state.tags).toEqualTypeOf<Array<'a' | 'b'> | undefined>()
  })

  it('infers correct return type overall', () => {
    const state = parseNextSearchParams(filters, {})
    expectTypeOf(state).toEqualTypeOf<InferFilterState<typeof filters>>()
  })
})

describe('parseNextSearchParamsAsync', () => {
  it('works with synchronous plain record input', async () => {
    const state = await parseNextSearchParamsAsync(filters, { search: 'acme', status: 'paid' })
    expect(state.search).toBe('acme')
    expect(state.status).toBe('paid')
  })

  it('works with Promise-wrapped input', async () => {
    const state = await parseNextSearchParamsAsync(
      filters,
      Promise.resolve({ search: 'acme', status: 'paid' })
    )
    expect(state.search).toBe('acme')
    expect(state.status).toBe('paid')
  })

  it('works with Promise-wrapped null', async () => {
    const state = await parseNextSearchParamsAsync(filters, Promise.resolve(null))
    expect(state).toEqual({})
  })

  it('works with undefined input', async () => {
    const state = await parseNextSearchParamsAsync(filters, undefined)
    expect(state).toEqual({})
  })

  it('removes invalid values', async () => {
    const state = await parseNextSearchParamsAsync(filters, { status: 'invalid' })
    expect(state.status).toBeUndefined()
  })

  it('resolves to InferFilterState type', async () => {
    const state = await parseNextSearchParamsAsync(filters, {})
    expectTypeOf(state).toEqualTypeOf<InferFilterState<typeof filters>>()
  })
})
