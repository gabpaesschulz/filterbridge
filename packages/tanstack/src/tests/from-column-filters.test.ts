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
import { fromTanStackColumnFilters } from '../from-column-filters'

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

describe('fromTanStackColumnFilters', () => {
  it('converts simple text filter back', () => {
    const state = fromTanStackColumnFilters(filters, [{ id: 'search', value: 'acme' }])
    expect(state.search).toBe('acme')
  })

  it('converts select filter back', () => {
    const state = fromTanStackColumnFilters(filters, [{ id: 'status', value: 'paid' }])
    expect(state.status).toBe('paid')
  })

  it('removes invalid select value', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'status', value: 'cancelled' },
    ])
    expect(state.status).toBeUndefined()
  })

  it('accepts multiSelect as array', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'tags', value: ['urgent', 'review'] },
    ])
    expect(state.tags).toEqual(['urgent', 'review'])
  })

  it('accepts multiSelect as comma-separated string', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'tags', value: 'urgent,review' },
    ])
    expect(state.tags).toEqual(['urgent', 'review'])
  })

  it('removes invalid multiSelect values', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'tags', value: ['urgent', 'nonexistent'] },
    ])
    expect(state.tags).toEqual(['urgent'])
  })

  it('removes fully invalid multiSelect', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'tags', value: ['nonexistent'] },
    ])
    expect(state.tags).toBeUndefined()
  })

  it('accepts boolean true', () => {
    const state = fromTanStackColumnFilters(filters, [{ id: 'archived', value: true }])
    expect(state.archived).toBe(true)
  })

  it('accepts boolean false', () => {
    const state = fromTanStackColumnFilters(filters, [{ id: 'archived', value: false }])
    expect(state.archived).toBe(false)
  })

  it('accepts boolean as string "true"', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'archived', value: 'true' },
    ])
    expect(state.archived).toBe(true)
  })

  it('accepts boolean as string "false"', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'archived', value: 'false' },
    ])
    expect(state.archived).toBe(false)
  })

  it('accepts dateRange as object', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'issuedAt', value: { from: '2026-01-01', to: '2026-01-31' } },
    ])
    expect(state.issuedAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('accepts dateRange with only from', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'issuedAt', value: { from: '2026-01-01' } },
    ])
    expect(state.issuedAt).toEqual({ from: '2026-01-01' })
  })

  it('accepts numberRange as object', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'amount', value: { min: 100, max: 2500 } },
    ])
    expect(state.amount).toEqual({ min: 100, max: 2500 })
  })

  it('accepts numberRange as tuple [min, max]', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'amount', value: [100, 2500] },
    ])
    expect(state.amount).toEqual({ min: 100, max: 2500 })
  })

  it('respects columnIds mapping', () => {
    const state = fromTanStackColumnFilters(
      filters,
      [
        { id: 'customerName', value: 'acme' },
        { id: 'issuedDate', value: { from: '2026-01-01' } },
      ],
      { columnIds: { search: 'customerName', issuedAt: 'issuedDate' } }
    )
    expect(state.search).toBe('acme')
    expect(state.issuedAt).toEqual({ from: '2026-01-01' })
  })

  it('ignores column ids not in schema', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'unknownColumn', value: 'something' },
    ])
    expect(Object.keys(state)).toHaveLength(0)
  })

  it('removes empty values', () => {
    const state = fromTanStackColumnFilters(filters, [
      { id: 'search', value: '' },
      { id: 'tags', value: [] },
    ])
    expect(state.search).toBeUndefined()
    expect(state.tags).toBeUndefined()
  })

  it('returns empty state for empty column filters', () => {
    const state = fromTanStackColumnFilters(filters, [])
    expect(state).toEqual({})
  })
})
